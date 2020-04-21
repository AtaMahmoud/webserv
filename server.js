const net = require('net');

function createWebServer(requestHandler) {
    const server = net.createServer();

    server.on('connection', handleConnection);

    function handleConnection(socket) {
        socket.once('readable', function () {
            let reqBuffer = new Buffer.from('');

            let buf;
            let reqHeader;
            while (true) {
                buf = socket.read();

                if (buf === null) break;

                reqBuffer = Buffer.concat([reqBuffer, buf]);

                let marker = reqBuffer.indexOf('\r\n\r\n');
                if (marker !== -1) {
                    let remaining = reqBuffer.slice(marker + 4);
                    reqHeader = reqBuffer.slice(0, marker).toString();

                    socket.unshift(remaining);
                    break;
                }
            }

            const reqHeaders = reqHeader.split('\r\n');
            const reqLine = reqHeaders.shift().split(' ');
            const headers = reqHeaders.reduce((acc, currentHeader) => {
                const [key, value] = currentHeader.split(':');
                return {
                    ...acc,
                    [key.trim().toLocaleLowerCase()]: value.trim()
                };
            }, {});

            const request = {
                method: reqLine[0],
                url: reqLine[1],
                httpVersion: reqLine[2].split('/')[1],
                headers,
                socket
            }

            let status = 200,
                statusText = 'OK',
                headersSent = false,
                isChunked = false;
            const responseHeaders = {
                server: 'my-custom-server'
            };

            function setHeader(key, value) {
                responseHeaders[key.toLocaleLowerCase()] = value;
            }

            function sendHeaders() {
                if (!headersSent) {
                    headersSent = true;

                    setHeader('date', new Date().toLocaleDateString());
                    socket.write(`HTTP/1.1 ${status} ${statusText}\r\n`);

                    Object.keys(responseHeaders).forEach(headerKey => {
                        socket.write(`${headerKey}: ${responseHeaders[headerKey]}\r\n`);
                    });

                    socket.write('\r\n');
                }
            }

            const response = {
                write(chunk) {
                    if (headersSent) {
                        if (!responseHeaders['content-length']) {
                            isChunked = true;
                            setHeader('transfer-encoding', 'chunked');
                        }

                        sendHeaders();
                    }

                    if (isChunked) {
                        const size = chunk.length.toString(16);
                        socket.write(`${size}\r\n`);
                        socket.write(chunk);
                        socket.write('\r\n');
                    } else {
                        socket.write(chunk);
                    }
                },
                end(chunk) {
                    if (!headersSent) {
                        if (!responseHeaders['content-length']) {
                            setHeader('content-length', chunk ? chunk.length : 0);
                        }
                        sendHeaders();
                    }

                    if (isChunked) {
                        if (chunk) {
                            const size = (chunk.length).toString(16);
                            socket.write(`${size}\r\n`);
                            socket.write(chunk);
                            socket.write('\r\n');
                        }

                        socket.end('0\r\n\r\n');
                    } else {
                        socket.end(chunk);
                    }
                },
                setHeader,
                setStatus(newStatus, newStatusText) {
                    status = newStatus;
                    statusText = newStatusText;
                },
                json(data) {
                    if (headersSent) {
                        throw new Error('Headers sent,cannot procced to send JSON');
                    }

                    const json = new Buffer(JSON.stringify(data));
                    setHeader('content-type', 'application/json; charset=utf-8');
                    setHeader('content-length', json.length);
                    sendHeaders();
                    socket.end(json);
                }
            };

            requestHandler(request,response);
        });
    }

    return {
        listen:(port)=>server.listen(port)
    };
}

const webServer=createWebServer((req,res)=>{
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    res.setHeader('Content-Type','text/plain');
    res.end('Hello World!');
});

webServer.listen(3100);