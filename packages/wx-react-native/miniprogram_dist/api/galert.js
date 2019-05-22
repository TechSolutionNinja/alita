/**
 * Copyright (c) Areslabs.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
 
export default function alert(msg = "") {
    wx.showModal({
        title: 'alert',
        content: msg + '',
        showCancel: false
    })
}