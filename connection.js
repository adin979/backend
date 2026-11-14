const mydb = require('./mydb/mydb')

const {ENDPOINT_DB,USER_DB,PASS_DB,APP_DATABASE_NAME} = process.env

const db = mydb.createConnection({host:ENDPOINT_DB,username:USER_DB,password:PASS_DB,database:APP_DATABASE_NAME})

module.exports=db
