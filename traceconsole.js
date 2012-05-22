/*
Copyright (c) 2012, Yahoo! Inc.  All rights reserved.

Redistribution and use of this software in source and binary forms, 
with or without modification, are permitted provided that the following 
conditions are met:

* Redistributions of source code must retain the above
  copyright notice, this list of conditions and the
  following disclaimer.

* Redistributions in binary form must reproduce the above
  copyright notice, this list of conditions and the
  following disclaimer in the documentation and/or other
  materials provided with the distribution.

* Neither the name of Yahoo! Inc. nor the names of its
  contributors may be used to endorse or promote products
  derived from this software without specific prior
  written permission of Yahoo! Inc.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS 
IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED 
TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A 
PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT 
OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, 
SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT 
LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, 
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY 
THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT 
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE 
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/**
 * A custom log4js appender specifically for tracer output.
 * @module comms-log4js-appenders-traceconsole
 */
YUI.add('comms-log4js-appenders-traceconsole', function(Y)
{
    Y.comms.log4js.register("traceconsole",
        function(logger, show, name)
        {
            var w, doc, output, timer, verbose, showStack, tedious, status, paused, lastFrame, root, frames,
                // fnCount = { },         // See the comment below about fnCount
                /**
                 * A custom log4js appender for displaying tracer output.  This appender
                 * is incompatible with 'normal' logging. Normal appender expect
                 * entry.msg to be a string.  This appender expects it to be an object
                 * describing a stack frame.
                 * @class traceconsole
                 */
                a = 
                {
                    /**
                     * The logger's interface to this appender. This method provides
                     * notification of a new log entry.
                     * @method notify
                     * @param entry {object|string}    The log entry. If entry.msg is
                     *                                 an object, it describes a stack
                     *                                 frame. If it's a string, it's an
                     *                                 annotation in the trace log.
                     */
                    notify: function(entry)
                    {
                        if (paused)
                            return;

                        var frame = entry.msg;

                        frame.idx = frames.push(frame) - 1;

                        if (typeof entry.msg != "object")
                        {
                            root.children[root.children.length-1].anno = entry.msg;
                            lastFrame.anno = entry.msg;
                            return;
                        }

                        // This counts the number of times a particular function gets traced.  If tracing
                        // makes the app unbearably slow, uncomment these lines (& the declaration above),
                        // let the tracer run a while, and then break here.  Open a console window and
                        // execute something like:
                        //         for (name in fnCount) { if (fnCount[name] > 500) console.log(name + ": " + fnCount[name]); }
                        // to see the most commonly traced methods.  Add those methods to the weaver's
                        // blacklist.
                        //if (!frame.stack)
                        //    fnCount[frame.n || frame.name] = (fnCount[frame.n || frame.name] || 0) + 1;

                        while (lastFrame.depth > frame.depth - 1)
                            lastFrame = lastFrame.parent;
                        lastFrame.children = lastFrame.children || [ ];
                        lastFrame.children.push(frame);
                        frame.parent = lastFrame;
                        lastFrame = frame;

                        if (frame.depth == 1)
                        {
                            if (timer)
                                clearTimeout(timer);
                            timer = setTimeout(expand, 100);
                        }

                        if ((frames.length - 1) % 500 == 0)
                        {
                            console.log("updating status to " + (frames.length -1));
                            status.innerHTML = (frames.length - 1) + " methods traced.";
                        }
                    },
                    /**
                     * Show the tracer's output window.
                     * @method show
                     */
                    show: function()
                    {
                        w = window.open('', name, 'width=650,height=700,resizable');
                        doc = w.document;

                        doc.open();
                        doc.write(
                            '<!DOCTYPE html>' +
                            '<html>' +
                                '<head>' +
                                    '<title>Yahoo! Mail Tracer</title>' +
                                    '<style>' +
                                        '.fixed > DIV { position: fixed }' +
                                        '#toolbar { border-bottom:1px solid #aca899;background-color:#f1efe7;height:22px;font-size:90%;left:0;right:0 }' +
                                        '.check { margin-right:3px;font-size:95%;font-family:inherit }' +
                                        '.output { position:fixed;width:100%;top:22px;bottom:22px;margin:0;overflow:auto }' +
                                        '#frame_0 { overflow:auto;display:inline-block }' +
                                        '.footer { position:fixed;width:100%;bottom:0px;height:22px;border-top:1px solid #aca899;background-color:#f1efe7;}' +
                                        '#tip { position:fixed;bottom:0px;height:19px;left:3px }' +
                                        '#status { float:right;margin:3px }' +
                                        '.hidden > DIV { display: none }' +
                                        '.expandable > .expander { background: url("http://mail.yimg.com/ok/u/assets/sprite/default/16x16/launch-ltr.png") no-repeat scroll 0 -360px transparent; }' +
                                        '.expander { width: 14px;height:11px;display:inline-block; } ' +
                                        '.expandable.expanded > .expander { background-position: 0 -390px; }' +

                                        '.expandable > .expandee { margin-left:5px;display:none }' +
                                        '.expandable.expanded > .expandee { display:block }' +
                                        '.toolbutton { font-size:90%; margin:2px; float:right; }' +
                                    '</style>' +
                                '</head>' +
                                '<body class="fixed" style="padding:0;margin:0;font-size:77%;font-family:tahoma,verdana">' +
                                    '<div id="toolbar">' +
                                        '<input id="showStack" type="checkbox" class="check"></input><label for="showStack">Include Stack</label>' +
                                        '<input id="verbose" type="checkbox" class="check"></input><label for="verbose">Verbose</label>' +
                                        '<input id="tedious" type="checkbox" class="check"></input><label for="tedious">Tedious</label>' +
                                        '<label for="pause" style="float:right;margin:3px">Pause</label><input id="pause" type="checkbox" style="float:right" class="check"></input>' +
                                        '<button id="clear" class="toolbutton">Clear</button>' +
                                    '</div>' +
                                    '<div class="output">'+
                                        '<div id="frame_0"></div>' +
                                    '</div>' +
                                    '<div class="footer">'+
                                        '<div id="tip"></div>' +
                                        '<div id="status"></div>'+
                                    '</div>' +
                                '</body>' +
                            '</html>');
                        doc.close();

                        output = doc.getElementById("frame_0");
                        status = doc.getElementById("status");

                        output.onclick = expandHandler;
                        output.ondblclick = expandAllHandler;

                        doc.getElementById("showStack").onclick = refresh;
                        doc.getElementById("verbose").onclick = update;
                        doc.getElementById("tedious").onclick = update;
                        doc.getElementById("pause").onclick = pause;
                        doc.getElementById("clear").onclick = clearAndRefresh;
                    },
                    /**
                     * Redraw the output. This method is public, but should
                     * only be used externally by the logger when the
                     * traceconsole is first created. Internally, it's used when
                     * the 'show stack' option changes.
                     * @method refresh
                     */
                    refresh: function()
                    {
                        showStack = doc.getElementById("showStack").checked;
                        verbose = doc.getElementById("verbose").checked;
                        tedious = doc.getElementById("tedious").checked;

                        if (output)
                        {
                            output.innerHTML = '';
                            for (var i = 1; i < frames.length; i++)
                            {
                                if (frames[i])
                                    frames[i].created = 0;
                            }
                            expand();
                        }
                    }
                },
                refresh = a.refresh;

            clear();

            logger.show = a.show;
            show && a.show();

            return a;

            /**
             * Pause tracing.
             * @method pause
             * @private
             */
            function pause()
            {
                paused = doc.getElementById("pause").checked;
                Y.comms.aop && (Y.comms.aop.paused = paused);
            }

            /**
             * Reset the trace console's data
             * @method clear
             * @private
             */
            function clear()
            {
                root = lastFrame = { depth: 0, idx: 0, created: 1 };
                frames = [ root ];
            }

            /**
             * Clear the trace console
             * @method clearAndRefresh
             * @private
             */
            function clearAndRefresh()
            {
                clear();
                refresh();
            }

            /**
             * Update the output. Used when the verbose/tedious state changes.
             * @method update
             * @private
             */
            function update()
            {
                verbose = doc.getElementById("verbose").checked;
                tedious = doc.getElementById("tedious").checked;

                var frame, el, inner, index,
                    i = 1;

                for (; i < frames.length; i++)
                {
                    if (frame = frames[i])
                    {
                        el = doc.getElementById("frame_" + i);
                        if (el)
                        {
                            inner = el.innerHTML;
                            index = inner.indexOf('<div id=');
                            if (index == -1)
                                inner = '';
                            else
                                inner = inner.substr(index);
                            el.innerHTML = '<div class="expander"></div>' + formatFrame(frame) + inner;
                        }
                    }
                }
            }

            /**
             * Event handler to expand a single item in the call stack
             * @method expandHandler
             * @private
             * @param evt
             */
            function expandHandler(evt)
            {
                if (!showStack)
                    return;

                evt = evt || w.event;

                var id, frame, el,
                    target = evt.target || evt.srcElement;

                setTimeout(doExpansion, 200);

                /**
                 * Find the frame to be expanded and call expand() on it.
                 * @method doExpansion
                 * @private
                 */
                function doExpansion()
                {
                    while (target && !target.id)
                        target = target.parentNode;

                    if (target)
                    {
                        id = target.id.split("_")[1];

                        frame = frames[id];
                        el = doc.getElementById("frame_" + frame.idx);

                        expand(0, frame);
                    }
                }
            }

            /**
             * Event handler to expand all children of an item in the call stack.
             * @method expandAllHandler
             * @private
             */
            function expandAllHandler(evt)
            {
                if (!showStack)
                    return;

                evt = evt || w.event;

                var id,
                    target = evt.target || evt.srcElement;

                while (!target.id)
                    target = target.parentNode;
                id = target.id.split("_")[1];
                expandAll(frames[id]);
            }

            /**
             * Expand an entry in the call stack, or simply display an entry if not in stack mode. DOM elements are
             * created on-demand, so expansion might require creating all the DOM elements.
             * @method expand
             * @private
             * @param parentFrame {object}        The stack frame to expand
             * @param expandOnly {boolean}        Truthy to expand a node, falsey to toggle a node's expansion state
             */
            function expand(dummy, parentFrame, expandOnly)
            {
                var child, el, ex,
                    i = 0,
                    innerHTML = '';

                parentFrame = parentFrame || root;

                if (!parentFrame.children)
                    return;

                el = doc.getElementById("frame_" + parentFrame.idx);

                if (showStack)
                {
                    if (hasClass(el, "expanded"))
                    {
                        if (!expandOnly)
                            removeClass(el, "expanded");
                    }
                    else
                        addClass(el, "expanded");

                    timer = 0;

                    while (child = parentFrame.children[i++])
                    {
                        if (!child.created)
                        {
                            child.created = 1;
                            ex = '';
                            if (child.children && child.children.length)
                                ex = ' expandable';

                            innerHTML += '<div id="frame_' + child.idx + '" class="expandee' + ex + '"><div class="expander"></div>' + formatFrame(child) + '</div>';
                        }
                    }

                }
                else
                {
                    for (; i < frames.length; i++)
                    {
                        child = frames[i];
                        if (child && !child.created && !child.stack)
                        {
                            child.created = 1;
                            innerHTML += '<div id="frame_' + child.idx + '">' + formatFrame(child) + '</div>';
                        }
                    }
                }

                if (innerHTML)
                    el.innerHTML += innerHTML;

                status.innerHTML = (frames.length - 1) + " methods traced.";
            }

            /**
             * Expand all children of a stack frame.
             * @method expandAll
             * @private
             * @param frame {object}      The frame to expand.
             */
            function expandAll(frame)
            {
                var child,
                    i = 0;

                if (frame.children)
                {
                    expand(0, frame, 1);
                    while (child = frame.children[i++])
                        expandAll(child);
                }
            }

            /**
             * Get the HTML for a stack frame
             * @method formatFrame
             * @private
             * @param frame {object}           The frame to be formatted
             * @return {string}                The HTML
             */
            function formatFrame(frame)
            {
                var arg, objText, value, m, mName, type,
                    i = 0,
                    args = frame.args,
                    argText = [ ],
                    name = "<strong>" + frame.name + "</strong>";

                if (frame.stack)
                    name = "<em>" + frame.name + "</em>";

                name = frame.idx + " " + name;
                
                while (args && (i < args.length))
                {
                    arg = args[i++];
                    type = typeof arg;
                    switch (type)
                    {
                        case 'number':
                        case 'boolean':
                            argText.push(arg);
                            break;

                        case 'string':
                            if (!tedious && arg.length > 50)
                                arg = arg.substr(0,47) + "...";
                            argText.push("'" + arg + "'");
                            break;

                        case 'function':
                            argText.push("function " + getFunctionName(arg) + "()");
                            break;

                        case 'object':
                            try
                            {
                                if ((tedious || verbose) && arg)
                                {
                                    objText = [ ];
                                    value = '';
                                    for (mName in arg)
                                    {
                                        m = arg[mName];
                                        switch (typeof m)
                                        {
                                            case 'number':
                                            case 'boolean':
                                                value = m;
                                                break;

                                            case 'string':
                                                if (!tedious && m.length > 50)
                                                    m = m.substr(0,47) + "...";
                                                value = "'" + m + "'";
                                                break;

                                            default:
                                                if (m)
                                                    value = "{" + typeof m + "}";
                                                else
                                                    value = "" + m;
                                        }

                                        objText.push(mName + ":" + value);
                                    }
                                    objText = objText.join(", ");
                                    if (!tedious && (objText.length > 50))
                                        objText = objText.substr(0, 47) + "...";

                                    argText.push("{" +  objText + "}");
                                    break;
                                }
                            }
                            catch (e) { }

                            arg && argText.push("{" + type + "}");
                            arg || argText.push("" + arg);
                    }
                }

                argText = "(" + argText.join(", ").replace(/</g, "&lt;") + ")";
                
                name = name + argText;

                if (frame.anno)
                    name = name + "    ***** " + frame.anno + " *****";

                return name;
            }

            /**
             * Try to get a function's name from the Function object.
             * @method getFunctionName
             * @private
             * @param fn {function}         The function whose name should be returned.
             * @return {string}             The name of the function, or "{?}" if it can't be found.
             */
            function getFunctionName(fn)
            {
                if (fn.name)
                    return fn.name;

                var name, fnStr, match;

                try
                {
                    fnStr = fn.toString();
                    match = fnStr.match(/function\s+([^\s(]+)/);

                    if (match && match.length > 1)
                        name = match[1];
                }
                catch (e) { }

                name = name || '{?}';
                name = name.replace(/^(\s+)?(.*\S)(\s+)?$/g, '$2');

                return name;
            }

            /**
             * Add one or more classes to a DOM element
             * @method addClass
             * @private
             * @param el {HTMLElement}          The DOM element
             * @param class {string}            The class to be added. Repeatable.
             */
            function addClass(el /*, class, ...*/)
            {
                var classes,
                    a = arguments,
                    i = a.length,
                    doc = document;

                if (typeof el == "string")
                    el = doc.getElementById(el);

                classes = el.className.split(" ");

                while (--i)
                {
                    if (!hasClass(el, arguments[i]))
                        classes.push(arguments[i]);
                }
                el.className = classes.join(" ");
            }

            /**
             * Remove a class from a DOM element
             * @method removeClass
             * @private
             * @param el {HTMLElement}         The DOM element
             * @param className                The class to remove
             */
            function removeClass(el, className)
            {
                if (typeof el == "string")
                    el = doc.getElementById(el);

                var i = 0,
                    classes = el.className.split(" ");

                while (i < classes.length)
                {
                    if (classes[i] == className)
                        classes.splice(i, 1);
                    else
                        i++;
                }

                el.className = classes.join(" ");
            }

            /**
             * Check to see if an element has a given class
             * @method hasClass
             * @private
             * @param el {HTMLElement}          The DOM element to check
             * @param className {string}        The class to check for
             * @return {boolean}                Truthy if the class is present, falsey otherwise.
             */
            function hasClass(el, className)
            {
                if (!el.className)
                    return;

                var i = 0,
                    classes = el.className.split(" ");

                while (i < classes.length)
                    if (classes[i++] == className)
                        return 1;
            }

        });

}, '1.0.0', { requires: [ 'comms-log4js' ] });
