import React, { Component, PureComponent } from "@areslabs/wx-react"
import { createAtom, Reaction, _allowStateChanges, $mobx } from "@areslabs/wx-mobx"
import hoistStatics from "./utils/hoistNonReactStatics"

import EventEmitter from "./utils/EventEmitter"
import inject from "./inject"
import { patch as newPatch, newSymbol } from "./utils/utils"

const mobxAdminProperty = $mobx || "$mobx"
const mobxIsUnmounted = newSymbol("isUnmounted")


let warnedAboutObserverInjectDeprecation = false

// WeakMap<Node, Object>;
export const componentByNodeRegistry = typeof WeakMap !== "undefined" ? new WeakMap() : undefined
export const renderReporter = new EventEmitter()

const skipRenderKey = newSymbol("skipRender")
const isForcingUpdateKey = newSymbol("isForcingUpdate")


/**
 * Helper to set `prop` to `this` as non-enumerable (hidden prop)
 * @param target
 * @param prop
 * @param value
 */
function setHiddenProp(target, prop, value) {
    if (!Object.hasOwnProperty.call(target, prop)) {
        Object.defineProperty(target, prop, {
            enumerable: false,
            configurable: true,
            writable: true,
            value
        })
    } else {
        target[prop] = value
    }
}


/**
 * Errors reporter
 */

export const errorsReporter = new EventEmitter()

/**
 * Utilities
 */

function patch(target, funcName) {
    newPatch(target, funcName, reactiveMixin[funcName])
}

function shallowEqual(objA, objB) {
    //From: https://github.com/facebook/fbjs/blob/c69904a511b900266935168223063dd8772dfc40/packages/fbjs/src/core/shallowEqual.js
    if (is(objA, objB)) return true
    if (typeof objA !== "object" || objA === null || typeof objB !== "object" || objB === null) {
        return false
    }
    const keysA = Object.keys(objA)
    const keysB = Object.keys(objB)
    if (keysA.length !== keysB.length) return false
    for (let i = 0; i < keysA.length; i++) {
        if (!hasOwnProperty.call(objB, keysA[i]) || !is(objA[keysA[i]], objB[keysA[i]])) {
            return false
        }
    }
    return true
}

function is(x, y) {
    // From: https://github.com/facebook/fbjs/blob/c69904a511b900266935168223063dd8772dfc40/packages/fbjs/src/core/shallowEqual.js
    if (x === y) {
        return x !== 0 || 1 / x === 1 / y
    } else {
        return x !== x && y !== y
    }
}

function makeComponentReactive(render) {
    function reactiveRender() {
        isRenderingPending = false
        let exception = undefined
        let rendering = undefined
        reaction.track(() => {
            try {
                rendering = _allowStateChanges(false, baseRender)
            } catch (e) {
                exception = e
            }
        })
        if (exception) {
            errorsReporter.emit(exception)
            throw exception
        }
        return rendering
    }

    // Generate friendly name for debugging
    const initialName =
        this.displayName ||
        this.name ||
        (this.constructor && (this.constructor.displayName || this.constructor.name)) ||
        "<component>"
    const rootNodeID =
        (this._reactInternalInstance && this._reactInternalInstance._rootNodeID) ||
        (this._reactInternalInstance && this._reactInternalInstance._debugID) ||
        (this._reactInternalFiber && this._reactInternalFiber._debugID)
    /**
     * If props are shallowly modified, react will render anyway,
     * so atom.reportChanged() should not result in yet another re-render
     */
    setHiddenProp(this, skipRenderKey, false)
    /**
     * forceUpdate will re-assign this.props. We don't want that to cause a loop,
     * so detect these changes
     */
    setHiddenProp(this, isForcingUpdateKey, false)

    // wire up reactive render
    const baseRender = render.bind(this)
    let isRenderingPending = false

    const reaction = new Reaction(`${initialName}#${rootNodeID}.render()`, () => {
        if (!isRenderingPending) {
            // N.B. Getting here *before mounting* means that a component constructor has side effects (see the relevant test in misc.js)
            // This unidiomatic React usage but React will correctly warn about this so we continue as usual
            // See #85 / Pull #44
            isRenderingPending = true
            if (typeof this.componentWillReact === "function") this.componentWillReact() // TODO: wrap in action?
            if (this[mobxIsUnmounted] !== true) {
                // If we are unmounted at this point, componentWillReact() had a side effect causing the component to unmounted
                // TODO: remove this check? Then react will properly warn about the fact that this should not happen? See #73
                // However, people also claim this might happen during unit tests..
                let hasError = true
                try {
                    setHiddenProp(this, isForcingUpdateKey, true)
                    if (!this[skipRenderKey]) Component.prototype.forceUpdate.call(this)
                    hasError = false
                } finally {
                    setHiddenProp(this, isForcingUpdateKey, false)
                    if (hasError) reaction.dispose()
                }
            }
        }
    })
    reaction.reactComponent = this
    reactiveRender[mobxAdminProperty] = reaction
    this.render = reactiveRender
    return reactiveRender.call(this)
}

/**
 * ReactiveMixin
 */
const reactiveMixin = {
    componentWillUnmount: function() {
        this.render[mobxAdminProperty] && this.render[mobxAdminProperty].dispose()
        this[mobxIsUnmounted] = true
    },

    componentWillMount: function() {

    },

    componentDidMount: function() {

    },

    componentDidUpdate: function() {

    },

    shouldComponentUpdate: function(nextProps, nextState) {
        // update on any state changes (as is the default)
        if (this.state !== nextState) {
            return true
        }
        // update if props are shallowly not equal, inspired by PureRenderMixin
        // we could return just 'false' here, and avoid the `skipRender` checks etc
        // however, it is nicer if lifecycle events are triggered like usually,
        // so we return true here if props are shallowly modified.
        return !shallowEqual(this.props, nextProps)
    }
}

function makeObservableProp(target, propName) {
    const valueHolderKey = newSymbol(`reactProp_${propName}_valueHolder`)
    const atomHolderKey = newSymbol(`reactProp_${propName}_atomHolder`)
    function getAtom() {
        if (!this[atomHolderKey]) {
            setHiddenProp(this, atomHolderKey, createAtom("reactive " + propName))
        }
        return this[atomHolderKey]
    }
    Object.defineProperty(target, propName, {
        configurable: true,
        enumerable: true,
        get: function() {
            getAtom.call(this).reportObserved()
            return this[valueHolderKey]
        },
        set: function set(v) {
            if (!this[isForcingUpdateKey] && !shallowEqual(this[valueHolderKey], v)) {
                setHiddenProp(this, valueHolderKey, v)
                setHiddenProp(this, skipRenderKey, true)
                getAtom.call(this).reportChanged()
                setHiddenProp(this, skipRenderKey, false)
            } else {
                setHiddenProp(this, valueHolderKey, v)
            }
        }
    })
}

/**
 * Observer function / decorator
 */
export function observer(arg1, arg2) {
    if (typeof arg1 === "string") {
        throw new Error("Store names should be provided as array")
    }
    if (Array.isArray(arg1)) {
        // TODO: remove in next major
        // component needs stores
        if (!warnedAboutObserverInjectDeprecation) {
            warnedAboutObserverInjectDeprecation = true
            console.warn(
                'Mobx observer: Using observer to inject stores is deprecated since 4.0. Use `@inject("store1", "store2") @observer ComponentClass` or `inject("store1", "store2")(observer(componentClass))` instead of `@observer(["store1", "store2"]) ComponentClass`'
            )
        }
        if (!arg2) {
            // invoked as decorator
            return componentClass => observer(arg1, componentClass)
        } else {
            return inject.apply(null, arg1)(observer(arg2))
        }
    }
    const componentClass = arg1

    if (componentClass.isMobxInjector === true) {
        console.warn(
            "Mobx observer: You are trying to use 'observer' on a component that already has 'inject'. Please apply 'observer' before applying 'inject'"
        )
    }
    if (componentClass.__proto__ === PureComponent) {
        console.warn(
            "Mobx observer: You are using 'observer' on React.PureComponent. These two achieve two opposite goals and should not be used together"
        )
    }

    // Stateless function component:
    // If it is function but doesn't seem to be a react class constructor,
    // wrap it to a react class automatically
    if (
        typeof componentClass === "function" &&
        (!componentClass.prototype || !componentClass.prototype.render) &&
        !componentClass.isReactClass &&
        !Component.isPrototypeOf(componentClass)
    ) {
        const observerComponent = observer(
            class extends Component {
                static displayName = componentClass.displayName || componentClass.name
                static contextTypes = componentClass.contextTypes
                static propTypes = componentClass.propTypes
                static defaultProps = componentClass.defaultProps
                render() {
                    return componentClass.call(this, this.props, this.context)
                }
            }
        )
        hoistStatics(observerComponent, componentClass)
        return observerComponent
    }

    if (!componentClass) {
        throw new Error("Please pass a valid component to 'observer'")
    }

    const target = componentClass.prototype || componentClass
    mixinLifecycleEvents(target)
    componentClass.isMobXReactObserver = true
    makeObservableProp(target, "props")
    makeObservableProp(target, "state")
    const baseRender = target.render
    target.render = function() {
        return makeComponentReactive.call(this, baseRender)
    }
    return componentClass
}

function mixinLifecycleEvents(target) {
    ;["componentWillMount", "componentDidMount", "componentWillUnmount", "componentDidUpdate"].forEach(function(
        funcName
    ) {
        patch(target, funcName)
    })
    if (!target.shouldComponentUpdate) {
        target.shouldComponentUpdate = reactiveMixin.shouldComponentUpdate
    } else {
        if (target.shouldComponentUpdate !== reactiveMixin.shouldComponentUpdate) {
            // TODO: make throw in next major
            console.warn(
                "Use `shouldComponentUpdate` in an `observer` based component breaks the behavior of `observer` and might lead to unexpected results. Manually implementing `sCU` should not be needed when using mobx-react."
            )
        }
    }
}
