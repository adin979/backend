<<<<<<< HEAD
const mydb = require('./mydb/mydb')

const {ENDPOINT_DB,USER_DB,PASS_DB,DATABASE} = process.env

const db = mydb.createConnection({host:ENDPOINT_DB,username:USER_DB,password:PASS_DB,database:DATABASE})

module.exports=db
=======
import 'dotenv/config'
import mongoose from "mongoose"

export const connectDB = async()=>{
    try {
        await mongoose.connect(process.env.my_db_MONGODB_URI)
        console.log('connect')
    } catch (error) {
        console.error('gagal',error.message)
        process.exit(1)
    }
}
>>>>>>> 81f7a9587df98884caba5d5f7ede0516c4cc4439
