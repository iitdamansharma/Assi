/**
 * On-Ground.ai Call Centre — Backend Server (server.js)
 * Zero-dependency Node.js HTTP + WebSocket signaling + AI Customer Reply server.
 * Run with: node server.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Connected WebSocket clients for Human-to-Human WebRTC signaling
const wsClients = new Set();

function parseJsonBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch (e) {
        resolve({});
      }
    });
  });
}

function generatePersonaReply({ lead = {}, agentText = '' }) {
  const lower = (agentText || '').toLowerCase();
  const persona = lead.aiPersona || {};
  const product = lead.preferredProduct || 'the appliance';

  if (lower.includes('book') || lower.includes('slot') || lower.includes('tomorrow') || lower.includes('lock') || lower.includes('schedule') || lower.includes('payment')) {
    return persona.closingResponse || `That works great for me! Please lock the offer on ${product} and send me the booking confirmation on WhatsApp.`;
  }
  if (lower.includes('warranty') || lower.includes('10-year') || lower.includes('10 year') || lower.includes('20-year') || lower.includes('motor') || lower.includes('rust') || lower.includes('descaler')) {
    return persona.warrantyResponse || `Knowing it has a 10-year warranty and store service support definitely resolves my concern. Can we lock the installation slot for tomorrow?`;
  }
  if (lower.includes('emi') || lower.includes('bajaj') || lower.includes('hdfc') || lower.includes('icici') || lower.includes('month') || lower.includes('cashback') || lower.includes('3,290') || lower.includes('6,490') || lower.includes('4,150') || lower.includes('3,850')) {
    return persona.emiResponse || `That monthly no-cost EMI split is much easier on my budget than paying all at once. What about the warranty on the motor?`;
  }
  if (lower.includes('whirlpool') || lower.includes('lg') || lower.includes('samsung') || lower.includes('bosch') || lower.includes('philips') || lower.includes('stabilizer') || lower.includes('exchange')) {
    return `The ${product} features sound good, but what is the best monthly EMI or exchange discount you can give me today?`;
  }
  return persona.objection || `I visited the store recently for ${product}, and wanted to check the final price after exchange and no-cost EMI options.`;
}

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = urlObj.pathname;

  // API: Contextual AI Customer Voice Reply
  if (pathname === '/api/ai-reply' && req.method === 'POST') {
    const payload = await parseJsonBody(req);
    const reply = generatePersonaReply(payload);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, reply }));
    return;
  }

  // API: Health & Calling Status
  if (pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'On-Ground.ai Call Centre Voice & WebRTC Server',
      connectedPeers: wsClients.size
    }));
    return;
  }

  // Serve Static Files
  let safePath = path.normalize(pathname === '/' ? '/index.html' : pathname).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(ROOT, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    fs.createReadStream(filePath).pipe(res);
  });
});

// Minimal RFC 6455 WebSocket implementation for zero-dependency WebRTC signaling
function encodeWsFrame(str) {
  const payload = Buffer.from(str, 'utf8');
  const len = payload.length;
  let header;
  if (len < 126) {
    header = Buffer.from([0x81, len]);
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([header, payload]);
}

function decodeWsFrames(buffer) {
  const messages = [];
  let offset = 0;
  while (offset + 2 <= buffer.length) {
    const byte1 = buffer[offset];
    const byte2 = buffer[offset + 1];
    const opcode = byte1 & 0x0f;
    const isMasked = (byte2 & 0x80) !== 0;
    let payloadLen = byte2 & 0x7f;
    let headerLen = 2;

    if (payloadLen === 126) {
      if (offset + 4 > buffer.length) break;
      payloadLen = buffer.readUInt16BE(offset + 2);
      headerLen = 4;
    } else if (payloadLen === 127) {
      if (offset + 10 > buffer.length) break;
      payloadLen = Number(buffer.readBigUInt64BE(offset + 2));
      headerLen = 10;
    }

    const maskLen = isMasked ? 4 : 0;
    if (offset + headerLen + maskLen + payloadLen > buffer.length) break;

    if (opcode === 0x8) {
      // Close frame
      return { close: true, messages };
    }

    let payload = buffer.slice(offset + headerLen + maskLen, offset + headerLen + maskLen + payloadLen);
    if (isMasked) {
      const mask = buffer.slice(offset + headerLen, offset + headerLen + 4);
      payload = Buffer.from(payload);
      for (let i = 0; i < payload.length; i++) {
        payload[i] ^= mask[i % 4];
      }
    }

    if (opcode === 0x1) {
      messages.push(payload.toString('utf8'));
    }
    offset += headerLen + maskLen + payloadLen;
  }
  return { close: false, messages };
}

server.on('upgrade', (req, socket) => {
  if (req.headers['upgrade'] !== 'websocket') {
    socket.destroy();
    return;
  }
  const key = req.headers['sec-websocket-key'];
  const accept = crypto
    .createHash('sha1')
    .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11', 'binary')
    .digest('base64');

  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
  );

  wsClients.add(socket);

  socket.on('data', (buf) => {
    const { close, messages } = decodeWsFrames(buf);
    if (close) {
      wsClients.delete(socket);
      socket.end();
      return;
    }
    for (const msg of messages) {
      const frame = encodeWsFrame(msg);
      for (const client of wsClients) {
        if (client !== socket && !client.destroyed) {
          try { client.write(frame); } catch (e) {}
        }
      }
    }
  });

  socket.on('close', () => wsClients.delete(socket));
  socket.on('error', () => wsClients.delete(socket));
});

server.listen(PORT, () => {
  console.log(`\n=============================================================`);
  console.log(`  On-Ground.ai Call Centre Server running at:`);
  console.log(`  -> Call Centre App:     http://localhost:${PORT}`);
  console.log(`  -> Companion Handset:   http://localhost:${PORT}/companion.html`);
  console.log(`=============================================================\n`);
});
