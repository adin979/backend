const { response } = require("express")

const mydb = {
    host:'',
    username:'',
    password:'',
    database:'',
    token:null,
    cookie:null,
    createConnection(object) {
        this.host = object.host
        this.username = object.username
        this.password = object.password
        this.database = object.database
        if(this.username===''||this.password===''||this.database==='')return alert('harus diisi')
        if(!this.token||this.token===undefined)this.login(this.username,this.password).then(res=>this.token=res)
    return this
    },
    async query(strQuery,cb){
        try{
            const fetchData =async(token)=>{
                return await fetch(`${this.host}/api/db/${this.database}`,{
                    method:'POST',
                    headers:{
                        'Content-type':'application/json',
                        'Authorization':`Bearer ${token}`,
                    },
                    ...(this.cookie?{'Cookie':this.cookie}:{}),
                    body:JSON.stringify({query:strQuery})
                })
            }
            let response = await fetchData(this.token)
            if(response.status===401||response.status===403){
                const accessToken = await this.refreshToken()
                this.token=accessToken
                response = await fetchData(accessToken)
            }   
            const data =await response.json()
            if(data.success){cb(null,data)}
            else{cb({status:response.status,message:data.error})}          
            }catch(error){console.error("query error : ",error);cb(error)}
    },
    login(username,password){
        return fetch(`${process.env.ENDPOINT_DB}/api/system/login`,{
            method:'POST',
            headers:{'Content-type':'application/json'},
            ...(this.cookie?{'Cookie':this.cookie}:{}),
            body:JSON.stringify({username:username,password:password})
        })
        .then(result=>{
            const newSetCookie = result.headers.get('set-cookie')
            console.log(newSetCookie)
            if(newSetCookie)this.cookie = newSetCookie.split(';');
            return result.json()
        })
        .then(data=> data.token)
        .catch(error=>console.error(error))
    },
    refreshToken(){
        return fetch(`${this.host}/api/system/refresh-token`,{
            method:'POST',
            headers:{
                'Content-type':'application/json',
                'Authorization':`Bearer ${this.token}`
            },
            ...(this.cookie?{'Cookie':this.cookie}:{})
        })
        .then((result)=>{result.json()})
        .then((data)=>{
            console.log(data)
            this.token=data
            data})
        .catch(error=>console.error(error))
    }
}
module.exports= mydb