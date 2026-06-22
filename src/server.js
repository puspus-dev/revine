import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import dotenv from "dotenv";

dotenv.config();

const app = Fastify({ logger:true });

await app.register(cors, { origin:true });
await app.register(jwt, {
  secret: process.env.JWT_SECRET || "dev_secret"
});

const users = [];
const videos = [];

app.get("/api/v1/health", async () => ({
  status:"ok",
  service:"reVine",
  version:"0.1.0"
}));

app.post("/api/v1/auth/register", async (req)=>{
  const {username,email,password}=req.body;

  const user={
    id:String(users.length+1),
    username,
    email,
    password
  };

  users.push(user);

  return {
    token: app.jwt.sign({id:user.id}),
    user:{
      id:user.id,
      username:user.username
    }
  };
});

app.post("/api/v1/auth/login", async(req)=>{
  const {email,password}=req.body;

  const user=users.find(
    u=>u.email===email && u.password===password
  );

  if(!user)
    return {error:"invalid_login"};

  return {
    token: app.jwt.sign({id:user.id}),
    user:{
      id:user.id,
      username:user.username
    }
  };
});

app.get("/api/v1/timelines/home", async()=>{
  return {
    data: videos.map(v=>({
      postId:v.id,
      username:v.username,
      videoUrl:v.videoUrl,
      caption:v.caption,
      likes:v.likes,
      loops:v.loops
    }))
  };
});

app.post("/api/v1/videos", async(req)=>{
  const {username,videoUrl,caption}=req.body;

  const video={
    id:String(videos.length+1),
    username,
    videoUrl,
    caption,
    likes:0,
    loops:0
  };

  videos.push(video);

  return video;
});

app.post("/api/v1/videos/:id/like", async(req)=>{
  const video=videos.find(v=>v.id===req.params.id);

  if(!video)
    return {error:"not_found"};

  video.likes++;

  return video;
});

app.post("/api/v1/videos/:id/loop", async(req)=>{
  const video=videos.find(v=>v.id===req.params.id);

  if(!video)
    return {error:"not_found"};

  video.loops++;

  return video;
});

app.listen({
  port:Number(process.env.PORT)||3000,
  host:"0.0.0.0"
});
