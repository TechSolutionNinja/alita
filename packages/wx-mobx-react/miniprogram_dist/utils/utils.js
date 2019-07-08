export function isStateless(component) {
    // `function() {}` has prototype, but `() => {}` doesn't
    // `() => {}` via Babel has prototype too.
    return !(component.prototype && component.prototype.render)
}

let symbolId = 0
function createSymbol(name) {
    if (typeof Symbol === "function") {
        return Symbol(name)
    }
    const symbol = `__$mobx-react ${name} (${symbolId})`
    symbolId++
    return symbol
}

const createdSymbols = {}
export function newSymbol(name) {
    if (!createdSymbols[name]) {
        createdSymbols[name] = createSymbol(name)
    }
    return createdSymbols[name]
}

const mobxMixins = newSymbol("patchMixins")
const mobxPatchedDefinition = newSymbol("patchedDefinition")

function getMixins(target, methodName) {
    const mixins = (target[mobxMixins] = target[mobxMixins] || {})
    const methodMixins = (mixins[methodName] = mixins[methodName] || {})
    methodMixins.locks = methodMixins.locks || 0
    methodMixins.methods = methodMixins.methods || []
    return methodMixins
}

function wrapper(realMethod, mixins, ...args) {
    // locks are used to ensure that mixins are invoked only once per invocation, even on recursive calls
    mixins.locks++

    try {
        let retVal
        if (realMethod !== undefined && realMethod !== null) {
            retVal = realMethod.apply(this, args)
        }

        return retVal
    } finally {
        mixins.locks--
        if (mixins.locks === 0) {
            mixins.methods.forEach(mx => {
                mx.apply(this, args)
            })
        }
    }
}

function wrapFunction(realMethod, mixins) {
    const fn = function(...args) {
        wrapper.call(this, realMethod, mixins, ...args)
    }
    return fn
}

export function patch(target, methodName, ...mixinMethods) {
    const mixins = getMixins(target, methodName)

    for (const mixinMethod of mixinMethods) {
        if (mixins.methods.indexOf(mixinMethod) < 0) {
            mixins.methods.push(mixinMethod)
        }
    }

    const oldDefinition = Object.getOwnPropertyDescriptor(target, methodName)
    if (oldDefinition && oldDefinition[mobxPatchedDefinition]) {
        // already patched definition, do not repatch
        return
    }

    const originalMethod = target[methodName]
    const newDefinition = createDefinition(
        target,
        methodName,
        oldDefinition ? oldDefinition.enumerable : undefined,
        mixins,
        originalMethod
    )

    Object.defineProperty(target, methodName, newDefinition)
}

function createDefinition(target, methodName, enumerable, mixins, originalMethod) {
    let wrappedFunc = wrapFunction(originalMethod, mixins)

    return {
        [mobxPatchedDefinition]: true,
        get: function() {
            return wrappedFunc
        },
        set: function(value) {
            if (this === target) {
                wrappedFunc = wrapFunction(value, mixins)
            } else {
                // when it is an instance of the prototype/a child prototype patch that particular case again separately
                // since we need to store separate values depending on wether it is the actual instance, the prototype, etc
                // e.g. the method for super might not be the same as the method for the prototype which might be not the same
                // as the method for the instance
                const newDefinition = createDefinition(this, methodName, enumerable, mixins, value)
                Object.defineProperty(this, methodName, newDefinition)
            }
        },
        configurable: true,
        enumerable: enumerable
    }
}

