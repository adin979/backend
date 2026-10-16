import 'dotenv/config'
import mongoose from "mongoose"

export const connectDB = async()=>{
    try {
        await mongoose.connect(process.env.my_db_MONGODB_URI)
        console.log('berhasil')
    } catch (error) {
        console.error('gagal',error.message)
        process.exit(1)
    }
}