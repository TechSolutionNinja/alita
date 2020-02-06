import React, { Component } from "react";
import { Button, ScrollView, StyleSheet, Text, View, TouchableWithoutFeedback, SafeAreaView, Dimensions } from "react-native";
import {AnimatedText, createAnimation, AnimatedImage, AnimatedView} from '@areslabs/wx-animated'

const {width } = Dimensions.get('window')

import MyAni from './MyAni'



export default class C extends Component {

    state = {
        ani1: null,
        ani2: null,
        ani3: null,
        ani4: null,
        ani5: null,
        ani6: null,
        ani7: null,
        ani8: null,
    }

    componentDidFocus() {
        console.log('C componentDidFocus')
        this.unfocus = false
        this.handleAni1()
        this.handleAni2()
        this.handleLoading1()
        this.handleLoading2()
        this.handleAni7()
        this.handleAni8()

    }

    componentWillUnfocus() {
        this.unfocus = true
    }




    handleAni1 = () => {
        if (this.unfocus) return

        const ani = createAnimation({
            duration: 1000,
            timingFunction: 'ease',
        })
        ani.opacity(0.5)
            .step()
            .opacity(1)
            .step()

        this.setState({
            ani1: ani.export(() => {
                this.handleAni1()
            })
        })
    }

    handleAni2 = () => {
        if (this.unfocus) return
        const ani = createAnimation({
            duration: 1500,
            timingFunction: 'linear',
        })
        ani
            .translateX(width - 100)
            .rotateZ(180)
            .scale(0.5, 0.5)
            .step()
            .translateX(0)
            .rotateZ(0)
            .scale(1, 1)
            .step()


        console.log('handleAni2')
        this.setState({
            ani2: ani.export(() => {
                this.handleAni2()
            })
        })
    }


    count = 0
    handleLoading1 = () => {
        if (this.unfocus) return
        const ani = createAnimation({
            duration: 800,
            timingFunction: 'linear',
        })
        ani
            .rotateZ(360 * (this.count ++))
            .step()

        this.setState({
            ani3: ani.export(() => {
                this.handleLoading1()
            })
        })
    }

    handleLoading2 = () => {
        if (this.unfocus) return
        const ani = createAnimation({
            duration: 150,
            timingFunction: 'linear',
        })
        ani
            .scale(1.5, 1.5)
            .step({
                delay: 0
            })
            .scale(1, 1)
            .step()

        const ani4 = ani.export()
        ani
            .scale(1.5, 1.5)
            .step({
                delay: 400
            })
            .scale(1, 1)
            .step()

        const ani5 = ani.export()

        ani
            .scale(1.5, 1.5)
            .step({
                delay: 800
            })
            .scale(1, 1)
            .step()

        const ani6 = ani.export(() => {
            this.handleLoading2()
        })

        this.setState({
            ani4,
            ani5,
            ani6
        })
    }

    handleAni7 = () => {
        if (this.unfocus) return
        const ani = createAnimation({
            duration: 800,
            timingFunction: 'ease',
        })
        ani
            .scale(0, 0)
            .step()
            .scale(1, 1)
            .step()

        this.setState({
            ani7: ani.export(() => {
                this.handleAni7()
            })
        })
    }

    handleAni8 = () => {
        if (this.unfocus) return
        const ani = createAnimation({
            duration: 800,
            timingFunction: 'ease',
        })

        ani
            .backgroundColor('#EEDC82')
            .step()

        this.setState({
            ani8: ani.export(() => {
                ani
                    .backgroundColor('#fff')
                    .step()

                this.setState({
                    ani8: ani.export(() => {
                        this.handleAni8()
                    })
                })
            })
        })
    }

    render() {
        return (
            <SafeAreaView style={{ flex: 1 }}>

                <View style={styles.section}>
                    <AnimatedText style={styles.txt} animation={this.state.ani1}>文字渐隐</AnimatedText>
                </View>

                <AnimatedView style={styles.bcg} animation={this.state.ani8}/>

                <View
                    style={styles.section}
                >
                    <Text style={styles.title}>移动旋转缩放</Text>

                    <AnimatedView
                        animation={this.state.ani2}
                        style={{
                            width: 80,
                            height: 80,
                            backgroundColor: '#EEDC82',
                            justifyContent: 'center',
                            alignItems: 'center',
                            left: 0,
                            top: 0
                        }}
                    >
                        <Text>A</Text>
                    </AnimatedView>
                </View>

                <View
                    style={styles.section}
                >
                    <Text style={styles.title}>Loading...</Text>

                    <View style={{flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center'}}>
                        <AnimatedView
                            style={styles.curve}
                            animation={this.state.ani3}
                        />

                        <View
                            style={styles.wxloading}

                        >
                            <AnimatedView
                                style={styles.squBlock}
                                animation={this.state.ani4}
                            />
                            <AnimatedView
                                style={styles.squBlock}
                                animation={this.state.ani5}
                            />
                            <AnimatedView
                                style={styles.squBlock}
                                animation={this.state.ani6}
                            />
                        </View>
                    </View>
                </View>

                <View
                    style={styles.section}
                >
                    <Text style={styles.title}>自定义组件</Text>

                    <MyAni animation={this.state.ani7}/>
                </View>

            </SafeAreaView>

        );
    }

}


const styles = StyleSheet.create({
    section: {
        marginBottom: 10,
        backgroundColor: '#fff',
        padding: 15,
    },

    txt: {
        height: 40,
        textAlign: 'center',
        lineHeight: 40,
    },
    title: {
        paddingBottom: 10,
        textAlign: 'center',
    },

    curve: {
        borderLeftWidth: 2,
        borderTopWidth: 2,
        borderRadius: 15,
        borderColor: 'red',
        height: 30,
        width: 30,
    },

    wxloading: {
        flexDirection: 'row',
        width: 40,
        justifyContent: 'space-around'
    },
    squBlock: {
        height: 8,
        width: 8,
        borderRadius: 4,
        backgroundColor: 'green'
    },

    bcg: {
        height: 50,
        marginBottom: 10,
        backgroundColor: '#fff'
    }

})

