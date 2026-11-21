
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
            const fetchData =async(token)=>{
                return await fetch(`${this.host}/api/db/${this.database}`,{
                    method:'POST',
                    headers:{
                        'Content-type':'application/json',
                        'Authorization':`Bearer ${token}`,
                    },
                    credentials:'include',
                    ...(this.cookie?{'Cookie':this.cookie}:{}),
                    body:JSON.stringify({query:strQuery})
                })
            }
            let response = await fetchData(this.token)
        try{
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
        return fetch(`${this.host}/api/system/login`,{
            method:'POST',
            headers:{'Content-type':'application/json'},
            ...(this.cookie?{'Cookie':this.cookie}:{}),
            credentials:'include',
            body:JSON.stringify({username:username,password:password})
        })
        .then(result=>{
            const newSetCookie = result.headers.get('set-cookie')
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
            credentials:'include',
            ...(this.cookie?{'Cookie':this.cookie}:{})
        })
        .then((result)=>{
            if(result.status&&result.status === 401 ){
                return this.login(this.username,this.password)
                .then(res=>{
                    this.token=res
                    return res
                })
            }
            return result.json().accessToken
        })
        .then((data)=>{
            this.token=data
            return data
        })
        .catch(error=>console.error(error))
    }
}
module.exports= mydb