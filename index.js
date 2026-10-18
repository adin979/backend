const express = require('express')
require('dotenv').config()
const mydb  = require('./mydb/mydb')
const app = express()
const cors = require('cors')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const { valReqBody, authenticateToken } = require('./middleware')
const db = require('./connection')
const {SIGN,REFRESH_SIGN, apiGenai}=require('./util')

const ai = new GoogleGenAi({apiKey:apiGenai})

app.use(express.json())
app.use(cors({
  origin:'http://localhost:5173',
  credentials:true,
  methods:['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders:['Content-type','Authorization']
}))
app.use(cookieParser())

app.get('/',(req,res)=>{
    res.send('api is ok')
})

app.post('/register',(req,res)=>{
    const {username,password,role}=req.body
    db.query(`SELECT * FROM users WHERE username = ${username}`,(error,result)=>{
        if(!result||result===undefined)db.query(`CREATE TABLE users`,(error,result)=>{
            return db.query(`INSERT INTO users (id,username,password,role) VALUES ('',${username},${password},${role})`,(error,result)=>{
                if(error)return res.status(500).json({success:false,error:error.message})        
                return res.json({success:true,message:`Daftar berhasil`,data:result.data})
           })

        })
        if(error)return res.status(500).json({success:false,error:error.message});
        if(result&&result.length>0)return res.status(400).json({success:false,error:'Username sudah digunakan, silahkan ganti!'});
        db.query(`INSERT INTO users (id,username,password,role) VALUES ('',${username},${password},${role})`,(error,result)=>{
            if(error)return res.status(500).json({success:false,error:error.message})        
            return res.json({success:true,message:`Daftar berhasil`,data:result.data})
        })
    })
})
app.post('/login',valReqBody,(req,res)=>{
    const {username,password} = req.body
    db.query(`SELECT * FROM users WHERE username = '${username}' `,async(error,result)=>{
        if(error)return res.status(500).json({success:false,error:error.message})
        const {id,username:user,password:pass,role}=result[0]
        if(!result||result.length===0)return res.status(400).json({success:false,error:'user tidak ketemu'})
        const validatedPassword = await bcrypt.compare(password,pass)
        if(!validatedPassword)return res.status(400).json({success:false,error:'password salah!'});
        const token = jwt.sign(
            {
                id:id,
                username:user,
                role:role
            },
            SIGN,
            {expiresIn:'15s'}
        )
        const refreshToken = jwt.sign(
            {
                id:id,
                username:user,
                role:role
            },
            REFRESH_SIGN,
            {expiresIn:'7d'}
        )
        res.cookie('refreshToken',refreshToken,{
            httpOnly:true,
            secure:false,
            sameSite:'strict',
            maxAge:7*24*60*60*1000
        })
        res.json({success:true,message:`User ${user} berhasil login dengan Role ${role}`,data:{token:token,role:role}})
    })
})
app.post('/refresh-token',(req,res)=>{
  const refreshToken = req.cookies.refreshToken
  if(!refreshToken)return res.status(401).json({success:false,error:'refresh cookie tidak ditemukan'});
  
  jwt.verify(refreshToken,REFRESH_SIGN,(error,decocedUser)=>{
    if(error){
      res.clearCookie('refreshToken')
      return res.status(403).json({success:false,error:'Sesi kadaluarsa, silahkan login ulang'})
    }
    const newAccessToken = jwt.sign(
      {id:decocedUser.id,username : decocedUser.username},
      SIGN,
      {expiresIn:'15m'}  
    )
    res.json({success:true,accessToken:newAccessToken})
  })
})

app.get('/warga',authenticateToken,(req,res)=>{
    db.query(`SELECT * FROM warga`,(error,result)=>{
        if(error)res.status(500).json({success:false,error:error})
        res.json({success:true,message:Object.keys(result)?.length||0+' Data ditampilkan',data:result})
    })
})
// app.get('/warga/:id',(req,res)=>{
//     const [id] = req.params
//     db.query(`SELECT * FROM warga WHERE id =`+id,(error,result)=>{
//         if(error)res.status(500).json({success:false,error:error})
//         res.json({success:true,message:'Data berhasil diambil',data:result})
//     })
// })

app.post('/warga',(req,res)=>{
    const {nama,no_kk,nik} = req.body
    db.query(`INSERT INTO warga 
        (id,nama,no_kk,nik) 
        VALUES
        ('',${nama},${no_kk},${nik})`,
        (error,result)=>{
            if(error)return error
            res.json({success:true,message:'data berhasil ditambahkan',data:result.data})
        })
})

app.post('/genai',(req,res)=>{
    const {image}=req.body
    if(!image)return res.status(400).json({success:false,error:'File harus diisi'});
    const base64Data = image.split(',')[1]||image;
    ai.models.generateContent({
        model:'gemini-2.5-flash',
        contents:[
            {
                inlineData:{
                    mimeType:'image/jpeg',
                    data:base64Data
                }
            },
            {
                text: 'Ekstrak data dari gambar dokumen/struk ini dengan sangat akurat sesuai schema JSON.'
            }
        ],
        config:{
            responseMimeType:'application/json',
            responseSchema:{
                type:Type.OBJECT,
                properties:{
                    no_kk:{type:Type.STRING,description:'nomor yang ada di bawak kalimat "KARTU KELUARGA" setelah kata no.'}
                },
                required:[no_kk]
            }
        }
    })
    .then(response=>{response.text})
    .then(result=>{
        if(!result)throw new Error('Model tidak menghasilkan text');
        return res.json({success:true,message:'Data berhasil dibaca',data:JSON.parse(result)})
    })
    .catch(error=>res.status(500).json({success:false,error:error.message}))
})

app.put('/warga/:id',(req,res)=>{
    const {id} = req.params
    const{nama,no_kk,nik}=req.body
    db.query(`UPDATE warga SET nama = ${nama} , no_kk = ${no_kk} , nik = ${nik} WHERE id = ${id}`,(error,result)=>{
        if(error)return error
        return res.json({success:true,message:`Data dengan id "${id}" berhasil diubah`,data:result.data})
    })
})

app.delete('/warga/:id',(req,res)=>{
    const {id}=req.params
    db.query(`DELETE FROM warga WHERE id = ${id}`,(error,result)=>{
        if(error)return error;
        return res.json({success:true,message:`Data dengan id '${id}' berhasil dihapus`})
    })
})



app.listen(3001,()=>{
    console.log('listen port 3001')
})