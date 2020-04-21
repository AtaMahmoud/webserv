const net=require('net');
const server=net.createServer();

server.on('connection',handleConnection);
server.listen(3000);

function handleConnection(socket) {
   socket.once('readable',function () {
      let reqBuffer=new Buffer('');
      
      let buf;
      let reqHeader;
      while(true){
          buf=socket.read();

          if(buf===null)break;

          reqBuffer=Buffer.concat([reqBuffer,buf]);
          
          let marker=reqBuffer.indexOf('\r\n\r\n');
          if(marker!==-1){
              let remaining=reqBuffer.slice(marker+4);
              reqHeader=reqBuffer.slice(0,marker).toString();

              socket.unshift(remaining);
              break;
          }
      }
      
      const reqHeaders=reqHeader.split('\r\n');
      const reqLine=reqHeaders.shift().split(' ');
      const headers=reqHeaders.reduce((acc,currentHeader)=>{
          const [key,value]=currentHeader.split(':');
          return{
              ...acc,
              [key.trim().toLocaleLowerCase()]:value.trim()
          };
      },{});

      const request={
          method:reqLine[0],
          url : reqLine[1],
          httpVersion:reqLine[2].split('/')[1],
          headers,
          socket
      }

      let status=200,statusText='OK',headersSent=false,isChunked=false;
      const responseHeaders={
          server:'my-custom-server'
      };

      function setHeader(key,value) {
          responseHeaders[key.toLocaleLowerCase()]=value;
      }

      function sendHeaders() {
          if(!headersSent){
              headersSent=true;

              setHeader('date',new Date().toLocaleDateString());
              socket.write(`HTTP/1.1 ${status} ${statusText}\r\n`);

              Object.keys(responseHeaders).forEach(headerKey=>{
                  socket.write(`${headerKey}: ${responseHeaders[headerKey]}\r\n`);
              });

              socket.write('\r\n');
            }
      }

      
   });
}