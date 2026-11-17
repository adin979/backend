const express = require('express')
require('dotenv').config()
const cors = require('cors')
const multer = require('multer')
const cloudinary = require('cloudinary').v2
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const app = express()
const port = process.env.PORT || 3000
// DEPENDENCIES==================

const allowedOrigins = [
'http://localhost:5173',
'http://10.113.195.95:5173',
'http://192.168.0.101:5173',
'http://192.168.137.1:5173',
'http://10.117.46.95:5173',
'http://172.27.16.1:5173'
]

app.use(cors({
    origin:function(origin,callback){
        if(!origin||allowedOrigins.indexOf(origin) !== -1){callback(null,true)}
        else{callback(new Error('Ditolak oleh kebijakan CORS'))}
    },
    credentials:true,
    methods:['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    allowedHeaders:['Content-type','Authorization']
}))

const { valReqBody, authenticateToken } = require('./middleware')
const db = require('./connection')
const {SIGN,REFRESH_SIGN, apiGenai}=require('./util')

app.use(express.json())

cloudinary.config({
    cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET
})

const upload = multer({
    storage:multer.memoryStorage(),
    limit:{fileSize:4*1024*1024}
})

const uploadFile=(fileBuffer)=>{
    return new Promise((resolve,reject)=>{
        const stream=cloudinary.uploader.upload_stream({
            folder:'upload',
            type:'private',
            resource_type:'image',
            transformation:[
                {width:1800,crop:'limit'},
                {quality:'auto:good',fetch_format:'jpg'}
            ]
        },
        (error,result)=>{
            if(error)reject(error);
            else resolve(result)
        }
    )
    stream.end(fileBuffer)
    })
}

app.post('/parse-document',upload.single('image'),(req,res)=>{
    if(!req.file)return res.status(400).json({success:false,error:'File harus diisi'});
    uploadFile(req.file.buffer)
    .then(result=>{
        const filePath = cloudinary.utils.private_download_url(result.public_id,'jpg',{expires_at:Math.floor(Date.now()/1000)+(60*5),attachment:false})
        return fetch(apiGenai,{
            method:'POST',
            headers:{'Content-type':'application/json'},
            body:JSON.stringify({filePath:`${filePath}`})
        })
        .then(response=>response.json())
        .then(result=>{
            const imageData = JSON.parse(result.data)
            return res.json({success:true,message:'Data berhasil diurai',data:{data:imageData.data,filePath:result.public_id}})
        }).catch(error=>res.status(500).json({success:false,error:error}))
    })
})

app.use(cookieParser())

app.get('/',(req,res)=>{
    res.send('api is ok')
})

app.post('/register',(req,res)=>{
    const {username,password,role}=req.body
    db.query(`SELECT username FROM users`,(error,result)=>{
        if(error)return res.status(500).json({success:false,error:error})
        if(!result||result===undefined){db.query(
            `CREATE TABLE users`,(error,result)=>{
                return db.query(`INSERT INTO users (id,username,password,role) VALUES ('',${username},${password},${role})`,(error,result)=>{
                    if(error)return res.status(500).json({success:false,error:error.message});   
                    return res.json({success:true,message:`Daftar berhasil`,data:result.data})
                })
            })
        }
        console.log(result)
        if(result && result !== 'undefined'){
            const isExistUser=result.some(r=>r.username === username)
            if(isExistUser)return res.status(400).json({success:false,error:'Username sudah digunakan, silahkan ganti!'});
        }
        if(error)return res.status(500).json({success:false,error:error.message});
        db.query(`INSERT INTO users (id,username,password,role) VALUES ('',${username},${password},${role})`,(error,result)=>{
            if(error)return res.status(500).json({success:false,error:error.message})        
            return res.json({success:true,message:`Daftar berhasil`,data:result.data})
        })
    })
})
app.post('/login',valReqBody,(req,res)=>{
    const {username,password} = req.body
    db.query(`SELECT * FROM users WHERE username = '${username}'`,async(error,result)=>{
        if(error)return res.status(500).json({success:false,error:error.message});
        if(!result||result.length===0)return res.status(400).json({success:false,error:'user tidak ketemu'})
        const {id,username:user,password:pass,role}=result.data[0]
        // const validatedPassword = await  bcrypt.compare(password,pass)
        const validatedPassword = pass === password
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
            secure:true,
            sameSite:'none',
            path:'/',
            maxAge:7*24*60*60*1000
        })
        return res.json({success:true,message:`User ${user} berhasil login dengan Role ${role}`,data:{token:token,role:role}})
    })
})
app.post('/refresh-token',(req,res)=>{
  const refreshToken = req.cookies.refreshToken
  if(!refreshToken)return res.status(401).json({success:false,error:'refresh cookie tidak ditemukan'});
  
  jwt.verify(refreshToken,REFRESH_SIGN,(error,decocedUser)=>{
    if(error){
      res.clearCookie('refreshToken',{
            httpOnly:true,
            secure:true,
            sameSite:'none',
            path:'/'
        })
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

app.get('/datakk',authenticateToken,(req,res)=>{
    const {limit,offset}=req.query
    db.query(`SELECT * FROM data_kk LIMIT = ${limit} OFFSET = ${offset}`,(error,result)=>{
        if(error)return res.status(500).json({success:false,error:error.message});
        return res.json({success:true,message:`${result.data?Object.keys(result.data).length:0} Data ditampilkan`,data:result.data})
    })
})
app.get('/kk/:no_kk/warga',authenticateToken,(req,res)=>{
    const {no_kk}=req.params
    db.query(`SELECT * FROM warga WHERE kartu_keluarga = ${no_kk}`,(error,result)=>{
        if(error)return res.status(parseInt(error.status)).json({success:false,error:error.message});
        return res.json({success:true,message:`${Object.keys(result.data).length||0}`,data:result.data})
    })
})
app.get('/warga',authenticateToken,(req,res)=>{
    const {limit,offset}=req.query
    db.query(`SELECT * FROM warga LIMIT = ${limit} OFFSET = ${offset}`,(error,result)=>{
        if(error){return res.status(500).json({success:false,error:error.message})}
        return res.json({success:true,message:`${result.data?Object.keys(result.data).length:0} Data ditampilkan`,data:result.data})
    })
})
app.get('/warga/search',authenticateToken,(req,res)=>{
    const {col,val} = req.query
    db.query(`SELECT * FROM warga WHERE ${col} LIKE ${val}`,(error,result)=>{
        if(error)return res.status(500).json({success:false,error:error});
        return res.json({success:true,message:'Data berhasil diambil',data:result})
    })
})

app.get('/datakk/search',authenticateToken,(req,res)=>{
    const {col,val} = req.query
    db.query(`SELECT * FROM data_kk WHERE ${col} LIKE ${val}`,(error,result)=>{
        if(error)return res.status(500).json({success:false,error:error});
        return res.json({success:true,message:'Data berhasil diambil',data:result})
    })
})

app.post('/datakk',authenticateToken,(req,res)=>{
    const {no_kk,nama_kepala_keluarga,alamat,rt_rw,desa_kelurahan,kecamatan,kabupaten_kota,provinsi,file_path}=req.body
    db.query(`INSERT INTO data_kk 
        (id,no_kk,nama_kepala_keluarga,alamat,rt_rw,desa_kelurahan,kecamatan,kabupaten_kota,provinsi,image_url)
        VALUES
        ('',${no_kk},${nama_kepala_keluarga},${alamat},${rt_rw},${desa_kelurahan},${kecamatan},${kabupaten_kota},${provinsi},${file_path})`,
        (error,result)=>{
            if(error)return res.status(505).json({success:false,error:error.message});
            if(!(result.success))return res.status(300).json({success:false,error:result.error})
            return res.json({success:true,message:`data berhasil disimpan`,data:result})
        }
    )
})

app.post('/warga',authenticateToken,(req,res)=>{
    const valueList = req.body.map(val=>{
        const values = Object.values(val).map(val=>{
            const escVal = String(val).replace(/'/g,"''")
            return `'${escVal}'`
        })
        return `('',${values.join(', ')})`
    }) 
    db.query(`INSERT INTO warga 
        (id,nama_lengkap,nik,jenis_kelamin,tempat_lahir,tanggal_lahir,status_hubungan,no_kk)
        VALUES
        ${valueList.join(',\n')}`,
        (error,result)=>{
            if(error)return res.status(505).json({success:false,error:error.message});
            if(!(result.success))return res.status(300).json({success:false,error:result.error})
            res.json({success:true,message:'data berhasil ditambahkan',data:result.data})
        })
})



app.put('/warga/:id',authenticateToken,(req,res)=>{
    const {id} = req.params
    const{nama,no_kk,nik}=req.body
    db.query(`UPDATE warga SET nama = ${nama} , no_kk = ${no_kk} , nik = ${nik} WHERE id = ${id}`,(error,result)=>{
        if(error)return error
        return res.json({success:true,message:`Data dengan id "${id}" berhasil diubah`,data:result.data})
    })
})

app.delete('/warga/:id',authenticateToken,(req,res)=>{
    const {id}=req.params
    db.query(`DELETE FROM warga WHERE id = ${id}`,(error,result)=>{
        if(error)return error;
        return res.json({success:true,message:`Data dengan id '${id}' berhasil dihapus`})
    })
})



app.listen(port,()=>{
    console.log('listen port 3001')
})