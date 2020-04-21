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
      console.log(`Request header: \n${reqHeader}`);

      reqBuffer=new Buffer('');
      while ((buf=socket.read())!==null) {
          reqBuffer=Buffer.concat([reqBuffer,buf]);
      }
      
      let reqBody=reqBuffer.toString();
       console.log(`Request body:\n${reqBody}`);
       socket.end('HTTP/1.1 200 OK\r\nServer: my-custom-server\r\nContent-Length: 0\r\n\r\n');
   });
}