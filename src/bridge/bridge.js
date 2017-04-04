
import { CONSTANTS } from '../conf';
import { getParent, isWindowClosed } from '../lib';
import { global } from '../global';
import { send } from '../interface';

/*
    HERE BE DRAGONS

    Warning: this file may look weird. Why save the tunnel window in an Object
    by ID, then look it up later, rather than just using the reference from the closure scope?

    The reason is, that ends up meaning the garbage collector can never get its hands
    on a closed window, since our closure has continued access to it -- and post-robot
    has no good way to know whether to clean up the function with the closure scope.

    If you're editing this file, be sure to run significant memory / GC tests afterwards.
*/

global.tunnelWindows = global.tunnelWindows || {};
global.tunnelWindowId = 0;

function cleanTunnelWindows() {
    let tunnelWindows = global.tunnelWindows;

    for (let key of Object.keys(tunnelWindows)) {
        let tunnelWindow = tunnelWindows[key];

        if (isWindowClosed(tunnelWindow.source)) {
            delete tunnelWindow.source;
            delete tunnelWindows[key];
        }
    }
}

function addTunnelWindow(data) {
    cleanTunnelWindows();
    global.tunnelWindowId += 1;
    global.tunnelWindows[global.tunnelWindowId] = data;
    return global.tunnelWindowId;
}

function getTunnelWindow(id) {
    return global.tunnelWindows[id];
}

global.openTunnelToParent = function openTunnelToParent(data) {

    let parentWindow = getParent(window);

    if (!parentWindow) {
        throw new Error(`No parent window found to open tunnel to`);
    }

    let id = addTunnelWindow(data);

    return send(parentWindow, CONSTANTS.POST_MESSAGE_NAMES.OPEN_TUNNEL, {

        name: data.name,

        sendMessage() {

            let tunnelWindow = getTunnelWindow(id);

            if (!tunnelWindow || !tunnelWindow.source || isWindowClosed(tunnelWindow.source)) {
                return;
            }

            try {
                tunnelWindow.canary();
            } catch (err) {
                return;
            }

            tunnelWindow.sendMessage.apply(this, arguments);
        }

    }, { domain: CONSTANTS.WILDCARD });
};
