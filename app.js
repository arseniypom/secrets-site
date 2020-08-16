require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const md5 = require('md5');

const app = express();

app.use(express.static('public'));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({
	extended: true
}));

mongoose.connect('mongodb://localhost:27017/userDB', {useNewUrlParser: true, useUnifiedTopology: true});

const userSchema = new mongoose.Schema({
	email: {
		type: String,
		required: true
	},
	password: {
		type: String,
		required: true
	}
});


const User = new mongoose.model('User', userSchema);


app.get('/', function (req, res) {
	res.render('home')
});

app.get('/login', function (req, res) {
	res.render('login')
});

app.get('/register', function (req, res) {
	res.render('register')
});

app.post('/register', function (req, res) {
	const newUser = new User({
		email: req.body.username,
		password: md5(req.body.password),
	});
	
	newUser.save(function (err) {
		if (err) {
			console.log(err)
		} else {
			res.render('secrets')
		}
		}
	);
});

app.post('/login', function (req, res) {
	User.findOne({email: req.body.username}, function (err, foundUser) {
		if (err) {
			console.log(err)
		} else {
			if (foundUser.password === md5(req.body.password)) {
				res.render('secrets')
			} else {
				res.send('Error')
			}
		}
	})
})


app.listen(process.env.PORT || 3000, function () {
	console.log('Server started successfully')
});