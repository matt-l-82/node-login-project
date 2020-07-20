const express = require('express');
// Once have imported dotenv can remove this URL
// const dbconnect = "mongodb+srv://dbUser7:dbUserPassword@mongodb-intro.c2wb8.mongodb.net/firsttest?retryWrites=true&w=majority";
const mongoose = require('mongoose');
// Anomynises username and password in database url, can then remove URL as const from above
const dotenv = require('dotenv');
dotenv.config({ path: './.env'});
const User = require('./models/user');
const path = require('path');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const auth = require('./middleware/auth');
const { db, findById } = require('./models/user');


// Intialises express
const app = express();

app.use(express.static('public'));

app.use(express.urlencoded());
app.use(express.json());
app.use(cookieParser());

const viewsPath = path.join(__dirname, '/views');
app.set('views', viewsPath);
app.set('view engine', 'hbs');

// Below removes warning messages that don't affect code. By using process.env.DB_URL can access .env file
mongoose.connect( process.env.DB_URL ,{
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB is connected'));


app.get("/", async (req,res) => {
    const allUsers = await User.find();
    console.log(allUsers);
    res.render("index", {
        users: allUsers
    })
})

app.get("/register", (req, res) => {
    res.render("register");
});

app.post("/register", async (req, res) => {
    const name = req.body.userName;
    const email = req.body.userEmail;
    const password = req.body.userPassword;
;
    const hashedPassword = await bcrypt.hash(password, 8);

    await User.create (
        {
         name: name,
         email: email,
         password: hashedPassword

        }
    );

     res.send("User updated");
});


app.get("/login", (req, res) => {
    res.render("login");
});

app.post("/login", async (req, res) => {
    const email = req.body.userEmail;
    const password = req.body.userPassword;

    const user = await User.find({ email: email });

    console.log( user );

    if( user.length > 0 ) {
        console.log("Inside of user");
        console.log(password);
        console.log(user[0].password);
        const isMatch = await bcrypt.compare(password, user[0].password);
        
        console.log( isMatch );

        if( isMatch ) {

            const token = jwt.sign( {id: user[0]._id}, process.env.JWT_SECRET, {
                expiresIn: process.env.JWT_EXPIRES_IN
            });

            console.log(token);

            const cookieOptions = {
                expires: new Date(
                    Date.now() + process.env.JWT_COOKIE_EXPIRES * 24 * 60 * 60 * 1000
                ),
                httpOnly: true
            }

            res.cookie('jwt', token, cookieOptions);

            res.send("You are logged in");
        } else {
            res.send('Your login details are incorrect');
        }
    } else {
        res.send("Your email does not exist does not exist in the DB");
    }
});

// Middleware runs inbetween URL 

app.get("/profile", auth.isLoggedIn, (req, res) => {
    if( req.foundUser ) {
        res.render("profile", {
            name: req.foundUser.name
        });
    } else {
        res.redirect('/login');
    }
});

 app.get("/delete", (req, res) => {
     res.render("index") 
     
 });

 app.post("/delete/:id", async (req, res) => {
    let id = req.params.id;
    let userData = await User.findById(id)
  
    res.render('index', {
        message: `User '${userData.name}' deleted`
    })
});

/***********************************
 
************************************/

app.get("/update/:id", async (req, res) => {

    console.log('Accessing update page');

    const id = req.params.id;
    const user = await User.findById(id);

    console.log(user);

    res.render("update", {
       id,
       userName: user.name,
       userEmail: user.email 
      
    });
});

 app.post("/update/:id", async (req, res) => {
   console.log("updating user....");

   const newUserName =  req.body.newUserName;
   const newUserEmail = req.body.newUserEmail;
   const currentPassword = req.body.currentPassword
   const newUserPassword = req.body.newUserPassword;
   const confirmPassword = req.body.confirmPassword;
   const hashPassword = await bcrypt.hash(newUserPassword, 8);

   const id = req.params.id;
   const user = await User.findById(id);
   const isMatch = await bcrypt.compare(currentPassword, user.password)

   if( isMatch && newUserPassword === confirmPassword  ) {

        await User.findByIdAndUpdate(id, { 
            name: newUserName, 
            email: newUserEmail, 
            password: hashPassword
        });

        res.render("update", {
            id,
            userName: newUserName,
            userEmail: newUserEmail,
            message: "User updated successfully!"
        }); 
    } else if (isMatch && newUserPassword != newUserPassword2) {
        res.render("update", {
            id,
            userName: user.name,
            userEmail: user.email,
            message: 'Passwords do not match'
        });
    } else if (!isMatch) {
        res.render("update", {
            id,
            userName: user.name,
            userEmail: user.email,
            message: 'Oh no! Your password is not correct'
        });
    };
 });

 app.get('/logout', auth.logout, (req, res) => {
    res.send('User is logged out')
 })

app.listen(process.env.PORT, () => console.log(`Server started on Port ${process.env.PORT}`));
