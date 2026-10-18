const SqlParser = require('./queryParser')
const localStorage = require('../localStorage')

class Mydb {
    constructor(){
        this.host
        this.username
        this.password
        this.database
    }
    createConnection(object) {
        this.host = object.host
        this.username = object.username
        this.password = object.password
        this.database = object.database
        if(this.username===''||this.password===''||this.database==='')return alert('harus diisi')
        if (!localStorage.getItem('token')) {
            if(this.host!==null)login(this.username,this.password)
        }
    return this
}
query(strQuery,cb){
        console.log( 'query',this.host)
        try {
            const sqlParser = new SqlParser(this.database)
            sqlParser.query(strQuery)
            .then(result=>cb(null,result))
            .catch(error=>cb(error))
        } catch (error) {
            cb(error)
        }
    }
}
function login(username,password){
    fetch(`${process.env.ENDPOINT_DB}/api/login`,{
        method:'POST',
        headers:{'Content-type':'application/json'},
        body:JSON.stringify({username:username,password:password})
    })
    .then(result=>result.json())
    .then(data=>{
        localStorage.setItem('token',data.token)
    })
    .catch(error=>console.error(error))
}
const mydb = new Mydb()
module.exports= mydb