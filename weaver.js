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
* An Aspect Weaver weaves an aspect into the public methods of all 
* objects that belong to a specified namespace node. As a result,
* any advices registered with the given aspect would run as per
* their specification i.e. 'before' advices would run before any 
* of the woven methods runs, 'after' advices would run after.
* @module comms-aop-weaver
*/
YUI.add('comms-aop-weaver', function(Y)
{
    var advice, i,
        weaveBlacklist  = [ ],
        maxWeaveDepth   = 100,
        all             = [ ],
        aop             = Y.namespace("comms.aop"),
        embeds          = document.embeds,           // an array of all embedded objects in the current document, incl. flash objects
        callDepth       = 0,
        inAdvice        = 0,
        lastStack       = [];
    
    /**
     * Walk through objects recursively, replacing every function encountered with our aspect/
     * @class weaver
     */

    /**
    * Weaves an aspect into the public methods of all objects that belong to a specified
    * namespace node.
    * @method weave
    * @param {String} ns        The name of the object being woven
    * @param {Object} o         The top node, i.e. the weaver's starting point node, of the 
    *                           object model to weave. It's OK to weave an object multiple
    *                           times (if the object, or anything it points to, changes.)
    * @param {Array} blacklist  Optional. An array of regular expressions. Object names which
    *                           match an expression in the blacklist won't be woven or
    *                           recursed into. Re-weaving with a new blacklist will replace the
    *                           existing blacklist.
    * @param {Number} maxDepth  Optional. The maximum depth to recurse to when weaving.
    *                           Defaults to 100 (if that doesn't weave everything, you _really_
    *                           need to refactor your code.)
    */
    aop.weave = function(ns, o, blacklist, maxDepth)
    {
        if (!o || (typeof o !== 'object'))
            return;

        weaveBlacklist = blacklist || weaveBlacklist;
        maxWeaveDepth = maxDepth || maxWeaveDepth;

        weave(ns, o, 1);

        for (i = 0; i < all.length; i++)
            delete all[i]._$marked$_;

        all = [ ];
    };

    // Don't weave the weaver!
    aop.weave._$woven$_ = 1;

    /**
     * Set the advice to use when tracing. (The method is called "addAdvice", but only one advice
     * is allowed.)
     * @method addAdvice
     * @param {Object} newAdvice     The advice to use. The object requires two members:
     *                               before - the before advice function,
     *                               after - the after advice function
     */
    aop.addAdvice = function(newAdvice)
    {
        advice = newAdvice;
    };

    // See http://code.google.com/p/v8/wiki/JavaScriptStackTraceApi for details of Chrome's
    // stack trace API
    if (Error.captureStackTrace)
    {
        getStack = function() { return (new Error()).stack; }

        Error.stackTraceLimit = 200;
        Error.prepareStackTrace = function(error, frames)
        {
            var frame, fn,
                stack = [ ],
                i = 2;

            while (frame = frames[i++])
            {
                fn = frame.getFunction();

                if (fn._$woven$_)
                    break;

                stack.push({ fn: fn, name: frame.getFunctionName() || "&lt;anonymous>", args: fn.arguments });
            }

            return stack;
        }
    }

    /**
    * Check a name against the blacklist.
    * @method skip
    * @private
    * @param name {String} 
    * @return {Boolean}         Truthy if the name should be skipped, falsey otherwise.
    */
    function skip(name)
    {
        for (var i = 0; i < weaveBlacklist.length; i++)
        {
            if (weaveBlacklist[i].test(name))
                return 1;
        }
    }

    /**
    * Recursively traverses the object hierarchy starting at the given node
    * @method _weave
    * @param {String} ns        The name of the object being woven
    * @param {Object} o         The object to weave
    * @param {Number} depth     The current recursive depth
    */
    function weave(ns, o, depth)
    {
        var name, wovenFn, fullName,  prop, weaveIt, embedIx, own,
            embedCount = embeds.length;

        // if not a DOM element and not the global window object
        if (!o.getElementsByTagName && (o != window))
        {
            // if the prototype has been woven earilier, allow for
            // weaving other objects with the same prototype
            if (o.hasOwnProperty && o.hasOwnProperty("_$marked$_") && (o._$marked$_))
                return;

            // a given object can be referenced more than once i.e. by
            // more than one object; ensure it's only instrumented once
            o._$marked$_ = 1;
            all.push(o);

            for (name in o)
            {
                fullName = ns + '.' + name;

                try { prop = o[name]; } // faster access
                catch (e) { continue; }

                switch (typeof prop)
                {
                    case 'function':
                        if ((prop.hasOwnProperty && prop.hasOwnProperty("_$woven$_") && prop._$woven$_)
                                || skip(fullName))
                            continue;

                        // embedded objects are problematic here as JS reports
                        // them to be of type 'function'. Furthermore, flash embed
                        // objects get to have at some point certain properties
                        // and methods e.g. fetch(), however JS throws an
                        // exception if one attemps to enumerate an embedded
                        // object properties. The way to filter those out then,
                        // is to check each function for reference equality against 
                        // the embeds array.
                        if (embedCount > 0)
                        {
                            weaveIt = true;
                            for (embedIx = 0; embedIx < embedCount; embedIx++)
                            {
                                if (prop === embeds[embedIx])
                                    weaveIt = false;
                            }
                            if (!weaveIt)
                                continue;
                        }

                        wovenFn = aspect(fullName, prop, name);

                        // copy any own properties that might have been attached to this function.
                        // there are legit cases when a function might have a property on a function
                        // particularly constructor functions e.g. when wanting to create a 'static',
                        // in the C++/Java sense, function. if the property is a function, weave it,
                        // if not - simply attach it.
                        for (own in prop)
                        {
                            if (own == "_$marked$_")
                                continue;

                            if (prop.hasOwnProperty(own))
                                wovenFn[own] = prop[own];
                        }

                        // prototypes aren't enumerable.  Make sure to copy them, too.
                        if (prop.hasOwnProperty("prototype"))
                            wovenFn.prototype = prop.prototype;

                        // mark the function as woven using a different 
                        // marker than _$marked$_ as _$marked$_ would be
                        // deleted on the second pass.
                        wovenFn._$woven$_ = 1;
                        o[name] = wovenFn;

                        // Fall through... Functions are objects, too.

                    case 'object':
                        // guard against null as in JS null is an object
                        if (prop && (depth < maxWeaveDepth))
                            weave(fullName, prop, depth);
                        break;
                }
            }
        }
    }

    /**
    * Get the current call stack. Stops walking up the stack when it reaches a woven function
    * (because that function already got the stack above it.)
    * @method getStack
    * @private
    * @return {Array}         An array of objects describing the stack. Each object contains:
    *                         fn - The function,
    *                         name - The name of the function,
    *                         args - The arguments passed to the function
    */
    function getStack()
    {
        var a, i, name,
            l = 0,
            b = [ ],
            stack = [ ],
            args = arguments;

        try
        {
            while (!name && (a = args.caller ? args.caller.callee : args.callee.caller))
            {
                if ((l > 1) && a._$woven$_)
                    return stack;

                if (stack.length > 50)
                    name = "*** stack too deep, stopping";

                for (i = 0; i < l; i++)
                {
                    if (a == b[i])
                        name = "*** recursion, stopping";
                }

                args = a.arguments;
                b.push(a);
                l++;

                if (l > 1)
                    stack.push({ fn: a, name: name, args: args });
            }
        }
        catch (e)
        {
        }

        return stack;
    }

    /**
    * Creates a closure that makes the specified method args later available to the advices 
    * in this aspect.
    * @method aspect
    * @private
    * @param  {string} fullName    The full name (including namespace) of the function to be advised.
    * @param  {function} fn        The method to be advised/instrumented
    * @return {function}           The advised method
    */
    function aspect(fullName, fn)
    {
        return function()
        {
            var retVal, beforeMsg, i, stack, j, s, reporting,
                depth = callDepth,
                _this = this,
                args = arguments;

            if (inAdvice)
                return fn.apply(_this, args);

            stack = getStack();
            stack.reverse();
            reporting = i = 0;

            // Call the 'before' advice for non-woven functions we discovered on the stack. Note
            // that the 'after' advice won't be called for these functions.
            while (s = stack[i++])
            {
                if (reporting || (s.fn != lastStack[j]))
                {
                    s.depth = ++callDepth;
                    s.stack = 1;
                    reporting = 1;
                    beforeMsg = advice.before(s);
                }
            }

            lastStack = stack;

            // run the before advice
            inAdvice = 1;
            beforeMsg = advice.before({ fn: fn, name: fullName, depth: ++callDepth, args: args });
            inAdvice = 0;
            
            retVal = fn.apply(_this, args);

            // run the after advice(s), if any
            inAdvice = 1;
            advice.after(beforeMsg, retVal);
            inAdvice = 0;

            // If the function returns an object, weave it, jsut because we can. The fullName
            // here will be wrong - this object probably isn't being attached to 'this'.
            // I should probably indicate this somehow.
            if (retVal && (typeof retVal == 'object') || (typeof retVal == 'function'))
                aop.weave(fullName, retVal, 0, 1);

            callDepth = depth;

            return retVal;
        };
    };
}, '1.0.0', { requires: [ ] });
