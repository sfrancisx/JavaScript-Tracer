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
* Provides the advices necessary for runtime call tracing. Uses a custom
* log4js appender for output.
* @module comms-aop-tracer
*/
YUI.add('comms-aop-tracer', function(Y)
{
    var aop    = Y.namespace("comms.aop"),
        logger = Y.comms.log4js.getLogger('traceLogger', 1, 'traceconsole', 1),
        advice = aop.Tracer =
        {
            before: logger.log,
            after:  function() { },
            logger: logger
        };

    // Creating a Date for every log message is a surprising amount of overhead,
    // and I don't use it.  Tell the logger not to do it.
    logger.noDate = 1;

    // Uncomment this line if you have a lot of stuff in the global namespace that
    // you don't want to weave.
    //window._$woven$_ = 1;

    advice.before._$woven$_ = 1;
    advice.after._$woven$_ = 1;

}, '1.0.0', {requires:['comms-log4js', 'comms-log4js-appenders-traceconsole']});
