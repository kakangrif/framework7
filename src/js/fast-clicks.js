/*===============================================================================
************   Fast Clicks   ************
************   Inspired by https://github.com/ftlabs/fastclick   ************
===============================================================================*/
app.initFastClicks = function () {
    if (app.params.activeState) {
        $('html').addClass('watch-active-state');
    }

    var touchStartX, touchStartY, touchStartTime, targetElement, trackClick, activeSelection, scrollParent, lastClickTime, isMoved;
    var activableElement, activeTimeout;

    function findActivableElement(e) {
        var target = $(e.target);
        var parents = target.parents(app.params.activeStateElements);
        
        return (parents.length > 0) ? parents : target;
    }
    function isInsideScrollableView() {
        var pageContent = activableElement.parents('.page-content, .panel');
        
        if (pageContent.length === 0) {
            return false;
        }
        
        // This event handler covers the "tap to stop scrolling".
        if (pageContent.prop('scrollHandlerSet') !== 'yes') {
            pageContent.on('scroll', function() {
              clearTimeout(activeTimeout);
            });
            pageContent.prop('scrollHandlerSet', 'yes');
        }
        
        return true;
    }
    function addActive() {
        activableElement.addClass('active-state');
    }
    function removeActive(el) {
        activableElement.removeClass('active-state');
    }

    function androidNeedsBlur(el) {
        var noBlur = ('button checkbox file image radio submit input textarea').split(' ');
        if (document.activeElement && el !== document.activeElement && document.activeElement !== document.body) {
            if (noBlur.indexOf(el.nodeName.toLowerCase()) >= 0) {
                return false;
            }
            else {
                return true;
            }
        }
        else {
            return false;
        }
    }
    function targetNeedsFocus(el) {
        if (document.activeElement === el) {
            return false;
        }
        var tag = el.nodeName.toLowerCase();
        var skipInputs = ('button checkbox file image radio submit').split(' ');
        if (el.disabled || el.readOnly) return false;
        if (tag === 'textarea') return true;
        if (tag === 'select') {
            if (app.device.os === 'android') return false;
            else return true;
        }
        if (tag === 'input' && skipInputs.indexOf(el.type) < 0) return true;
    }
    function targetNeedsPrevent(el) {
        el = $(el);
        if (el.is('label') || el.parents('label').length > 0) {
            if (app.device.os === 'android') {
                var osv = app.device.osVersion.split('.');
                if (osv[0] * 1 > 4 || (osv[0] * 1 === 4 && osv[1] * 1 >= 4)) {
                    return false;
                }
                else return true;
            }
            else return false;
        }
        return true;
    }

    // Mouse Handlers
    function handleMouseDown (e) {
        findActivableElement(e).addClass('active-state');
        if ('which' in e && e.which === 3) {
            setTimeout(function () {
                $('.active-state').removeClass('active-state');
            }, 0);
        }
    }
    function handleMouseMove (e) {
        $('.active-state').removeClass('active-state');
    }
    function handleMouseUp (e) {
        $('.active-state').removeClass('active-state');
    }

    // Touch Handlers
    function handleTouchStart(e) {
        isMoved = false;
        if (e.targetTouches.length > 1) {
            return true;
        }

        if (app.device.os === 'ios') {
            var selection = window.getSelection();
            if (selection.rangeCount && (!selection.isCollapsed || document.activeElement === selection.focusNode)) {
                activeSelection = true;
                return true;
            }
            else {
                activeSelection = false;
            }
        }
        if (app.device.os === 'android')  {
            if (androidNeedsBlur(e.target)) {
                document.activeElement.blur();
            }
        }

        trackClick = true;
        targetElement = e.target;
        touchStartTime = (new Date()).getTime();
        touchStartX = e.targetTouches[0].pageX;
        touchStartY = e.targetTouches[0].pageY;

        // Detect scroll parent
        if (app.device.os === 'ios') {
            scrollParent = undefined;
            $(targetElement).parents().each(function () {
                var parent = this;
                if (parent.scrollHeight > parent.offsetHeight && !scrollParent) {
                    scrollParent = parent;
                    scrollParent.f7ScrollTop = scrollParent.scrollTop;
                }
            });
        }
        if ((e.timeStamp - lastClickTime) < 200) {
            e.preventDefault();
        }
        if (app.params.activeState) {
            activableElement = findActivableElement(e);
            // If it's inside a scrollable view, we don't trigger active-state yet,
            // because it can be a scroll instead. Based on the link:
            // http://labnote.beedesk.com/click-scroll-and-pseudo-active-on-mobile-webk
            if (!isInsideScrollableView(e)) {
                addActive();
            } else {
                activeTimeout = setTimeout(addActive, 80);
            }
        }
    }
    function handleTouchMove(e) {
        if (!trackClick) return;
        trackClick = false;
        targetElement = null;
        isMoved = true;

        if (app.params.activeState) {
            clearTimeout(activeTimeout);
            removeActive();
        }
    }
    function handleTouchEnd(e) {
        clearTimeout(activeTimeout);

        if (!trackClick) {
            if (!activeSelection) e.preventDefault();
            return true;
        }

        if (document.activeElement === e.target) {
            return true;
        }

        if (!activeSelection) {
            e.preventDefault();
        }

        if ((e.timeStamp - lastClickTime) < 200) {
            return true;
        }

        lastClickTime = e.timeStamp;
        touchStartTime = 0;

        trackClick = false;

        if (app.device.os === 'ios' && scrollParent) {
            if (scrollParent.scrollTop !== scrollParent.f7ScrollTop) {
                return false;
            }
        }

        // Add active-state here because, in a very fast tap, the timeout didn't
        // have the chance to execute. Removing active-state in a timeout gives 
        // the chance to the animation execute.
        if (app.params.activeState) {
            addActive();
            setTimeout(removeActive, 0);
        }

        // Trigger focus when required
        if (targetNeedsFocus(targetElement)) {
            targetElement.focus();
        }

        e.preventDefault();
        var touch = e.changedTouches[0];
        var evt = document.createEvent('MouseEvents');
        var eventType = 'click';
        if (app.device.os === 'android' && targetElement.nodeName.toLowerCase() === 'select') {
            eventType = 'mousedown';
        }
        evt.initMouseEvent(eventType, true, true, window, 1, touch.screenX, touch.screenY, touch.clientX, touch.clientY, false, false, false, false, 0, null);
        evt.forwardedTouchEvent = true;
        targetElement.dispatchEvent(evt);

        return false;

        
    }
    function handleTouchCancel(e) {
        trackClick = false;
        targetElement = null;
    }

    function handleClick(e) {
        var allowClick = false;

        if (trackClick) {
            targetElement = null;
            trackClick = false;
            return true;
        }

        if (e.target.type === 'submit' && e.detail === 0) {
            return true;
        }

        if (!targetElement) {
            allowClick =  true;
        }
        if (document.activeElement === targetElement) {
            allowClick =  true;
        }
        if (e.forwardedTouchEvent) {
            allowClick =  true;
        }
        if (!e.cancelable) {
            allowClick =  true;
        }

        if (!allowClick) {
            e.stopImmediatePropagation();
            e.stopPropagation();
            if (targetElement) {
                if (targetNeedsPrevent(targetElement) || isMoved) e.preventDefault();
            }
            else {
                e.preventDefault();
            }
            targetElement = null;
        }

        return allowClick;
    }
    if (app.support.touch) {
        document.addEventListener('click', handleClick, true);
        app.addGlobalEventListener('touchstart', handleTouchStart);
        app.addGlobalEventListener('touchmove', handleTouchMove);
        app.addGlobalEventListener('touchend', handleTouchEnd);
        app.addGlobalEventListener('touchcancel', handleTouchCancel);
    }
    else {
        if (app.params.activeState) {
            app.addGlobalEventListener('mousedown', handleMouseDown);
            app.addGlobalEventListener('mousemove', handleMouseMove);
            app.addGlobalEventListener('mouseup', handleMouseUp);
        }
    }
        
};
