const socket = io();

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const statusText = document.getElementById("status");

let localStream;
let pc;

const config = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

async function start() {
  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  });

  localVideo.srcObject = localStream;

  socket.on("ready", async () => {
    statusText.innerText = "Calling…";
    await createPeer(true);
  });

  socket.on("offer", async offer => {
    statusText.innerText = "Incoming call…";
    await createPeer(false);
    await pc.setRemoteDescription(offer);

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit("answer", answer);
  });

  socket.on("answer", async answer => {
    await pc.setRemoteDescription(answer);
    statusText.innerText = "Connected";
  });

  socket.on("ice", async candidate => {
    if (candidate) await pc.addIceCandidate(candidate);
  });
}

async function createPeer(isCaller) {
  pc = new RTCPeerConnection(config);

  localStream.getTracks().forEach(track =>
    pc.addTrack(track, localStream)
  );

  pc.ontrack = e => {
    remoteVideo.srcObject = e.streams[0];
  };

  pc.onicecandidate = e => {
    if (e.candidate) socket.emit("ice", e.candidate);
  };

  if (isCaller) {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("offer", offer);
  }
}

start().catch(err => alert(err.message));
