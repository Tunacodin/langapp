// Expo'yu dogru LAN IP'siyle baslatir. Amac: WSL/Hyper-V/Docker gibi sanal
// aglari atlayip telefonun erisebilecegi gercek Wi-Fi adresini (192.168.x / 10.x)
// otomatik secmek. Boylece her seferinde elle IP yazmaya gerek kalmaz.
//
// Kullanim: npm start           (ek bayrak: npm start -- -c)

const os = require('os');
const { spawn } = require('child_process');

function pickLanIp() {
  const ifaces = os.networkInterfaces();
  const candidates = [];
  for (const [name, addrs] of Object.entries(ifaces)) {
    for (const a of addrs || []) {
      if (a.family !== 'IPv4' || a.internal) continue;
      if (a.address.startsWith('169.254.')) continue; // link-local
      candidates.push({ name, address: a.address });
    }
  }
  // Oncelik: gercek ev agi (192.168.*), sonra 10.*, en sona 172.* (genelde WSL/Docker)
  const rank = (ip) => {
    if (ip.startsWith('192.168.')) return 0;
    if (ip.startsWith('10.')) return 1;
    if (ip.startsWith('172.')) return 3;
    return 2;
  };
  candidates.sort((x, y) => rank(x.address) - rank(y.address));
  return candidates[0];
}

const lan = pickLanIp();
const env = { ...process.env };
if (lan) {
  env.REACT_NATIVE_PACKAGER_HOSTNAME = lan.address;
  console.log(`[start] LAN IP secildi: ${lan.address} (${lan.name})`);
} else {
  console.log('[start] LAN IP bulunamadi, Expo varsayilanini kullanacak.');
}

const args = ['expo', 'start', ...process.argv.slice(2)];
const child = spawn('npx', args, { stdio: 'inherit', env, shell: true });
child.on('exit', (code) => process.exit(code ?? 0));
