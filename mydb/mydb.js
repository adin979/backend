
const mydb = {
    host:'',
    username:'',
    password:'',
    database:'',
    token:null,
    createConnection(object) {
        this.host = object.host
        this.username = object.username
        this.password = object.password
        this.database = object.database
        if(this.username===''||this.password===''||this.database==='')return alert('harus diisi')
        if(!this.token||this.token===undefined)this.login(this.username,this.password).then(res=>this.token=res)
    return this
    },
    query(strQuery,cb){
            fetch(`${this.host}/api/db/${this.database}`,{
                method:'POST',
                headers:{
                    'Content-type':'application/json',
                    'Authorization':`Bearer ${this.token}`,
                    'Credential':'include'
                },
                body:JSON.stringify({query:strQuery})
            })
            .then(res=>{
                if(res.status === 401 || res.status === 403){
                    return this.refreshToken()
                    .then(token=>{
                        fetch(`${this.host}/api/db/${this.database}`,{
                        method:'POST',
                        headers:{
                            'Content-type':'application/json',
                            'Authorization':`Bearer ${token}`,
                            'Credential':'include'
                        },
                        body:JSON.stringify({query:strQuery})
                        })
                        .then(response=>{
                            const data =response.json()
                            if(data.success){cb(null,data)}
                            else{cb(response)}
                        })
                        // .then(data=>cb(null,data))
                        .catch(error=>cb(error))
                    })
                }
                return res.json()
            })
            .then(result=>{
                cb(null,result)
            })
            .catch(error=>{cb(error)})
    },
    login(username,password){
        return fetch(`${process.env.ENDPOINT_DB}/api/system/login`,{
            method:'POST',
            headers:{'Content-type':'application/json'},
            body:JSON.stringify({username:username,password:password})
        })
        .then(result=>result.json())
        .then(data=> data.token)
        .catch(error=>console.error(error))
    },
    refreshToken(){
        return fetch(`${mydb.host}/api/system/refresh-token`,{
            method:'POST',
            headers:{
                'Content-type':'application/json',
                'Authorization':`Bearer ${this.token}`,
                'Credential':'include'
            },
        })
        .then((result)=>{
            console.log("refreshToken : ",result)
            if(result.status&&(result.status === 403 || result.status === 401)){
                return this.login(this.username,this.password)
                .then(data=>{
                    this.token=data
                    return data
                })
                .catch(error=>{throw new Error(error)})
            }
            return result.json()
        })
        .then((data)=>{
            return data.accessToken
        })
    }
}
module.exports= mydb