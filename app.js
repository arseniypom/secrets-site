require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
// Encryption
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
// const bcrypt = require('bcrypt');
// const saltRounds = 10;

//OAuth Google
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

//OAuth Facebook
const FacebookStrategy = require('passport-facebook').Strategy;


const app = express();

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

//Passport settings
app.use(session({
  secret: 'My little secret.',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// mongoose.connect('mongodb://localhost:27017/userDB', {
//   useNewUrlParser: true,
//   useUnifiedTopology: true
// });
mongoose.connect(`mongodb+srv://admin-arseniy:${process.env.PASSWORD}@cluster0.kwkdp.mongodb.net/userDB?retryWrites=true&w=majority`, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false
});
mongoose.set('useCreateIndex', true);

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  googleId: String,
  facebookId: String,
	secret: String
});
//Adding passport-local-mongoose plugin to the Schema
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model('User', userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});
//Google Strategy (Pssport)
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
		// callbackURL: 'http://localhost:3000/auth/google/secrets'
    callbackURL: 'https://hidden-beach-71172.herokuapp.com/auth/google/secrets'
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({
      googleId: profile.id
    }, function(err, user) {
      return cb(err, user);
    });
  }
));

//Facebook Strategy (Pssport)
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
		// callbackURL: 'http://localhost:3000/auth/facebook/secrets'
    callbackURL: "https://hidden-beach-71172.herokuapp.com/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({
      facebookId: profile.id
    }, function(err, user) {
      return cb(err, user);
    });
  }
));

app.get('/', function(req, res) {
  res.render('home')
});

//GET requests for Google authentication
app.get('/auth/google',
  passport.authenticate('google', {
    scope: ['profile']
  })
);

app.get('/auth/google/secrets',
  passport.authenticate('google', {
    failureRedirect: '/login'
  }),
  function(req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect('/secrets');
  }
);

//GET requests for Facebook authentication
app.get('/auth/facebook',
  passport.authenticate('facebook', {
    scope: ['profile']
  })
);

app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', {
    failureRedirect: '/login'
  }),
  function(req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect('/secrets');
  }
);

app.get('/login', function(req, res) {
  res.render('login')
});

app.get('/register', function(req, res) {
  res.render('register')
});

app.get('/secrets', function(req, res) {
  if (req.isAuthenticated()) {
		User.find({'secret': {$ne: null}}, function(err, foundUsers) {
			if (err) {
				console.log(err);
			} else {
				if (foundUsers.length != 0) {
					res.render('secrets', {usersWithSecrets: foundUsers});
				} else {
					res.render('secrets', {usersWithSecrets: null});
				}
			}
		});
  } else {
    res.redirect('login');
  }
});

app.get('/submit', function(req, res) {
	if (req.isAuthenticated()) {
    res.render('submit');
  } else {
    res.redirect('login');
  }
});

app.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
})

app.post('/register', function(req, res) {
  User.register({
    username: req.body.username
  }, req.body.password, function(err, user) {
    if (err) {
      console.log(err);
      res.redirect('/register');
    } else {
      passport.authenticate('local')(req, res, function() {
        res.redirect('/secrets');
      })
    }
  });
});

app.post('/login', function(req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password
  })

  req.login(user, function(err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate('local')(req, res, function() {
        res.redirect('/secrets');
      })
    }
  })
});

app.post('/submit', function(req, res) {
	const submittedSecret = req.body.secret;

	User.findById(req.user.id, function(err, foundUser) {
    if (err) {
			console.log(err);
		} else {
			if (foundUser) {
				foundUser.secret = submittedSecret;
				foundUser.save(function(){
					res.redirect('/secrets');
				});
			}
		}
  });
});


app.listen(process.env.PORT || 3000, function() {
  console.log('Server started successfully')
});
