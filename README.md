#qread#
qread 是一个基于qrcode的二维码探测和解码的js, 参考了目前主流的二维码编解码框架zxing的一些使用。
关于二维码的编码解码文档地址：[ISO 18004:2006](http://download.adamas.ai/dlbase/Stuff/ISO_IEC-18004-2006.pdf)
[![Build Status](https://travis-ci.org/atrl/qread.png)](https://travis-ci.org/atrl/qread)
##关于二维码中文处理##
二维码在中文中使用gb2312进行编码，由于js在对gb2312转换的问题，暂时没做处理，具体规范可以参考 GB／T 18284-2000

##如何使用##
> var qread = require('./src/qread');
> var result = qread(image);

##Todo##
增加对gb2312的支持 通过data:text/javascript;转换的字符需要异步 这里需要调整接口

