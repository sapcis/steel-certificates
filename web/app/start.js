const express = require('express');
var request = require('request');
var cors = require('cors');
const app = express();


let serviceKey;
serviceKey = JSON.parse(process.env.VCAP_SERVICES)["hyperledger-fabric"][0].credentials;

serviceKey.channelId="steel-certificates";

app.use(cors());
app.use(function(req, res, next) {
  req.rawBody = '';
  req.setEncoding('utf8');

  req.on('data', function(chunk) { 
    req.rawBody += chunk;
  });

  req.on('end', function() {
    next();
  });
});

//save cert
app.post('/certsave', function (req, res) {

	var tk1="Basic " + Buffer.from(serviceKey.oAuth.clientId + ":" + serviceKey.oAuth.clientSecret).toString('base64');
	var reqUrl=serviceKey.oAuth.url + '/oauth/token?grant_type=client_credentials'
	reqJson=JSON.parse(req.rawBody);
	console.log(reqJson);
	request({
		uri:reqUrl,
		body:'',
		method: 'GET',
		headers:{
			'Content-Type': 'application/json',
			'Authorization': tk1
		}
	},function(err,response){
		var reqUrl=serviceKey.serviceUrl + '/chaincodes/' + serviceKey.channelId + '/latest/' + reqJson.serialNumber;
		var tk2 = "Bearer "+ JSON.parse(response.body).access_token;
		console.log(reqUrl);
		var body=JSON.stringify({
			"id":reqJson.id.toString(),
			"certnumber":reqJson.certnumber.toString(),
			"certdate":reqJson.certdate,
			"companycode":reqJson.companycode,
			"manufacturercode":reqJson.manufacturercode,
			"certcheckcode":reqJson.certcheckcode,
			"productname":reqJson.productname,
			"status":reqJson.status,
			/*"checkcsumpow":reqJson.checkcsumpow,*/
			"certurl":reqJson.certurl
		});
		console.log('->',body);
		request({
			uri:reqUrl,
			body:body,
			method: 'POST',
			headers:{
				'Content-Type': 'application/json',
				'Authorization': tk2
			}
		},function(err2,response2){
			//console.log(err2);
			//console.log(response2);
			res.set('Content-Type', 'application/json');
			res.send(response2.body);
		});
	});
});

//cert exists

app.get('/api/getcert/:certId', function (req, res) {
	console.log(req.params.certId);
	var certNum=req.params.certId;
	
	var tk1="Basic " + Buffer.from(serviceKey.oAuth.clientId + ":" + serviceKey.oAuth.clientSecret).toString('base64');
	var reqUrl=serviceKey.oAuth.url + '/oauth/token?grant_type=client_credentials'
	request({
		uri:reqUrl,
		body:'',
		method: 'GET',
		headers:{
			'Content-Type': 'application/json',
			'Authorization': tk1
		}
	},function(err,response){
		var reqUrl=serviceKey.serviceUrl + '/chaincodes/' + serviceKey.channelId + '/latest/certificate/certnumber/' + certNum;
		//console.log(response.rawBody);
		var tk2 = "Bearer "+ JSON.parse(response.body).access_token;
		request({
			uri:reqUrl,
			body:'',
			method: 'GET',
			headers:{
				'Content-Type': 'application/json',
				'Authorization': tk2
			}
		},function(err2,response2){
			console.log(response2.body);
			var resp2Body=JSON.parse(response2.body);
			console.log(response2.rawBody);
			res.set('Content-Type', 'application/json');
			if (typeof(resp2Body.error)!="undefined")
			{
				res.send({
					error:true,
					errorMsg:"Сертификата №"+certNum+" не существует."
				});
				responseBody.replies[0].type="text";
				responseBody.replies[0].content="Сертификата №"+certNum+" не существует."
			}
			else
			{
				res.send(resp2Body);
			}
		});
	});
});
//find
app.post('/api/findcert/:certId/:certDate/:manufacturerCode/:certCheckCode/:certCompanyCode', function (req, res) {
	console.log(req.params.certId);
	var certId=req.params.certId;
	var certDate=req.params.certDate;
	var certCompanyCode=req.params.certCompanyCode;
	var manufacturerCode=req.params.manufacturerCode;
	var certCheckCode=req.params.certCheckCode;
	
	var reqJson=JSON.parse(req.rawBody);
	var token=reqJson.token;
	var captcha=reqJson.captcha;
	if (typeof captcha!="undefined"&&captcha.length>0)
	{
		//v2
		var payload="?secret="+encodeURI("6LcESMsUAAAAAKTMKK5xbK8FvKYuvH1GhT7rlk7X")+"&response="+encodeURI(captcha);
		var payload_uri='https://www.google.com/recaptcha/api/siteverify';
	}
	else
	{
		//v3
		var payload="?secret="+encodeURI("6LfVRMsUAAAAAPcBAX2r-QuEt--_U9btdBWOL5PY")+"&response="+encodeURI(token);
		var payload_uri='https://www.google.com/recaptcha/api/siteverify';
	}
	//verify captcha
	request({
		uri:payload_uri+payload,
		body:'',
		method: 'GET',
		headers:{
			'Content-Type': 'application/json'
		}
	},function(err0,response0){
		console.log('google captcha',err0,response0);
		var r=JSON.parse(response0.body);
		var success=false;
		if (r.success&&(typeof captcha!="undefined"&&captcha.length>0))
		{
			console.log('google v2 verify passed');
			success=true;
		} else if (r.success&&r.score>=0.5)
		{
			console.log('google v3 verify passed');
			success=true;
		}
		else{
			console.log('verify not passed render captcha');
			res.send({
				error:true,
				error_code:"captcha",
				errorMsg:"Пройдите проверку \"Я не робот\"."
			});
		}
		if (success){
			var tk1="Basic " + Buffer.from(serviceKey.oAuth.clientId + ":" + serviceKey.oAuth.clientSecret).toString('base64');
			var reqUrl=serviceKey.oAuth.url + '/oauth/token?grant_type=client_credentials'
			request({
				uri:reqUrl,
				body:'',
				method: 'GET',
				headers:{
					'Content-Type': 'application/json',
					'Authorization': tk1
				}
			},function(err,response){
				var reqUrl=serviceKey.serviceUrl + '/chaincodes/' + serviceKey.channelId + '/latest/certificate/find/' + certId +'/'+certDate+'/'+manufacturerCode+'/'+certCheckCode+'/'+certCompanyCode;
				//console.log(response.rawBody);
				var tk2 = "Bearer "+ JSON.parse(response.body).access_token;
				request({
					uri:reqUrl,
					body:'',
					method: 'GET',
					headers:{
						'Content-Type': 'application/json',
						'Authorization': tk2
					}
				},function(err2,response2){
					console.log(response2.body);
					var resp2Body=JSON.parse(response2.body);
					console.log(response2.rawBody);
					res.set('Content-Type', 'application/json');
					if (typeof(resp2Body.error)!="undefined")
					{
						res.send({
							error:true,
							errorMsg:"Сертификата №"+certNum+" не существует."
						});
						responseBody.replies[0].type="text";
						responseBody.replies[0].content="Сертификата №"+certNum+" не существует."
					}
					else
					{
						res.send(resp2Body);
					}
				});
			});
		}
	});
});
app.post('/api/certbyhash/:hash', function (req, res) {
	console.log(req.params.hash);
	var hash=req.params.hash;
	
	var reqJson=JSON.parse(req.rawBody);
	var token=reqJson.token;
	var captcha=reqJson.captcha;
	if (typeof captcha!="undefined"&&captcha.length>0)
	{
		//v2
		var payload="?secret="+encodeURI("6LcESMsUAAAAAKTMKK5xbK8FvKYuvH1GhT7rlk7X")+"&response="+encodeURI(captcha);
		var payload_uri='https://www.google.com/recaptcha/api/siteverify';
	}
	else
	{
		//v3
		var payload="?secret="+encodeURI("6LfVRMsUAAAAAPcBAX2r-QuEt--_U9btdBWOL5PY")+"&response="+encodeURI(token);
		var payload_uri='https://www.google.com/recaptcha/api/siteverify';
	}
	//verify captcha
	request({
		uri:payload_uri+payload,
		body:'',
		method: 'GET',
		headers:{
			'Content-Type': 'application/json'
		}
	},function(err0,response0){
		console.log('google captcha',err0,response0);
		var r=JSON.parse(response0.body);
		var success=false;
		if (r.success&&(typeof captcha!="undefined"&&captcha.length>0))
		{
			console.log('google v2 verify passed');
			success=true;
		} else if (r.success&&r.score>=0.5)
		{
			console.log('google v3 verify passed');
			success=true;
		}
		else{
			console.log('verify not passed render captcha');
			res.send({
				error:true,
				error_code:"captcha",
				errorMsg:"Пройдите проверку \"Я не робот\"."
			});
		}
		if (success){
			var tk1="Basic " + Buffer.from(serviceKey.oAuth.clientId + ":" + serviceKey.oAuth.clientSecret).toString('base64');
			var reqUrl=serviceKey.oAuth.url + '/oauth/token?grant_type=client_credentials'
			request({
				uri:reqUrl,
				body:'',
				method: 'GET',
				headers:{
					'Content-Type': 'application/json',
					'Authorization': tk1
				}
			},function(err,response){
				var reqUrl=serviceKey.serviceUrl + '/chaincodes/' + serviceKey.channelId + '/latest/certificates/'+hash;
				console.log('reqUrl',reqUrl);
				var tk2 = "Bearer "+ JSON.parse(response.body).access_token;
				request({
					uri:reqUrl,
					body:'',
					method: 'GET',
					headers:{
						'Content-Type': 'application/json',
						'Authorization': tk2
					}
				},function(err2,response2){
					console.log(response2.body);
					var resp2Body=JSON.parse(response2.body);
					console.log(response2.rawBody);
					res.set('Content-Type', 'application/json');
					if (typeof(resp2Body.error)!="undefined")
					{
						res.send({
							error:true,
							errorMsg:"Сертификат не существует."
						});
						responseBody.replies[0].type="text";
						responseBody.replies[0].content="Сертификат не существует."
					}
					else
					{
						res.send(resp2Body);
					}
				});
			});
		}
	});
});
//TODO: make all on callbacks
//get cert by id/sn
app.post('/certbyid', function (req, res) {

});
app.use('/create', express.static('private'));
app.use('/', express.static('public'));

const port = process.env.PORT || 3000;

app.listen(port, function () {
	console.log('FileServer listening on port ' + port);
});