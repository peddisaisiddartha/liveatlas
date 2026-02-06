const socket = io();

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const statusText = document.getElementById("status");

const roomId =
  new URLSearchParams(window.location.search).get("room") || "default";

let localStream;
let peer;

const rtcConfig = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

async function start() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 24 }
      },
      audio: true
    });

    localVideo.srcObject = localStream;
    statusText.innerText = "Camera ready";

    socket.emit("join-room", roomId);
  } catch (err) {
    console.error(err);
    statusText.innerText = "Camera permission failed";
  }
}

socket.on("user-joined", async () => {
  statusText.innerText = "User joined. Calling...";
  await createPeer(true);
});

socket.on("offer", async (offer) => {
  await createPeer(false);
  await peer.setRemoteDescription(new RTCSessionDescription(offer));

  const answer = await peer.createAnswer();
  await peer.setLocalDescription(answer);

  socket.emit("answer", { roomId, answer });
});

socket.on("answer", async (answer) => {
  await peer.setRemoteDescription(new RTCSessionDescription(answer));
  statusText.innerText = "Connected";
});

socket.on("ice-candidate", async (candidate) => {
  if (peer && candidate) {
    await peer.addIceCandidate(new RTCIceCandidate(candidate));
  }
});

async function createPeer(isCaller) {
  peer = new RTCPeerConnection(rtcConfig);

  // 🔒 Lock video bitrate for better quality
peer.onnegotiationneeded = async () => {
  const sender = peer.getSenders().find(
    s => s.track && s.track.kind === "video"
  );

  if (sender) {
    const params = sender.getParameters();
    if (!params.encodings) params.encodings = [{}];

    params.encodings[0].maxBitrate = 2_500_000; // 2.5 Mbps (720p stable)
    await sender.setParameters(params);
  }
};

  localStream.getTracks().forEach((track) => {
    peer.addTrack(track, localStream);
  });

  peer.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };

  peer.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("ice-candidate", {
        roomId,
        candidate: event.candidate
      });
    }
  };

  if (isCaller) {
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    socket.emit("offer", { roomId, offer });
  }
}

start();
