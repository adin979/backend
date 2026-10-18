<<<<<<< HEAD
const jwt = require('jsonwebtoken')
const JWT_SECRET = 'kode_rahasia'

// export function checkDbOwnership(req,res,next){
//     const {dbName} = req.params
//     const currentUser = req.user.username

//     if(!dbName)return res.status(400).json({success:false,error:'Nama Database tidak valid'});

//     try {
//         const db = new Database(dbName)
//         if(db.owner&&db.owner !== currentUser){
//             return res.status(403).json({
//                 success:false,
//                 error:'akses ditolak'
//             })
//         }
//         req.db = db
//         next()
//     } catch (error) {
//         return res.status(404).json({
//             success:false,
//             error:`Database ${dbName} tidak ditemukan`
//         })
//     }
// }

function authenticateToken(req,res,next){
=======
import jwt from 'jsonwebtoken'
import { Database } from './database.js'
const JWT_SECRET = 'kunci_jwt'

export function checkDbOwnership(req,res,next){
    const {dbName} = req.params
    const currentUser = req.user.username

    if(!dbName)return res.status(400).json({success:false,error:'Nama Database tidak valid'});

    try {
        const db = new Database(dbName)
        if(db.owner&&db.owner !== currentUser){
            return res.status(403).json({
                success:false,
                error:'akses ditolak'
            })
        }
        req.db = db
        next()
    } catch (error) {
        return res.status(404).json({
            success:false,
            error:`Database ${dbName} tidak ditemukan`
        })
    }
}

export function authenticateToken(req,res,next){
>>>>>>> 81f7a9587df98884caba5d5f7ede0516c4cc4439
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if(!token){
        return res.status(401).json({
            success : false,
            error : 'akses ditolak'
        })
    }

    jwt.verify(token,JWT_SECRET,(error,user)=>{
        if(error){
            return res.status(403).json({
                success : false,
                error : 'token invalid'
            })
        }

        req.user = user
        next()
    })
}

<<<<<<< HEAD
function valReqBody(req,res,next){
=======
export function valReqBody(req,res,next){
>>>>>>> 81f7a9587df98884caba5d5f7ede0516c4cc4439
    if(!req.body || Object.keys(req.body).length === 0){
        return res.status(400).json({
            success : false,
            error : 'Data body request tidak boleh kosong'
        })
    }

    next()
}

<<<<<<< HEAD
function errorHandler(error,req,res,next){
=======
export function errorHandler(error,req,res,next){
>>>>>>> 81f7a9587df98884caba5d5f7ede0516c4cc4439
    console.error('Error Detected :',error.stack)
    res.status(500).json({
        success : false,
        error : 'terjadi kesalahan internal pada server',
        details : error.message
    })
}
<<<<<<< HEAD

module.exports = {valReqBody,authenticateToken,errorHandler}
=======
>>>>>>> 81f7a9587df98884caba5d5f7ede0516c4cc4439
