const functions = require('firebase-functions');
const app = require('express')();

const admin = require('firebase-admin');
admin.initializeApp();

const firebaseConfig = {
	apiKey: 'AIzaSyBCpeVts7n8rEOu4V7atis3Jg40PidA0Vo',
	authDomain: 'socialape-e1ed1.firebaseapp.com',
	projectId: 'socialape-e1ed1',
	storageBucket: 'socialape-e1ed1.appspot.com',
	messagingSenderId: '58131666516',
	appId: '1:58131666516:web:033df80a136df92ce8bfc1',
	measurementId: 'G-N01Z6X5RGR',
};

const firebase = require('firebase');

firebase.initializeApp(firebaseConfig);

const db = admin.firestore();

app.get('/scream', (req, res) => {
	db.collection('screams')
		.orderBy('createdAt', 'desc')
		.get()
		.then(data => {
			let screams = [];
			data.forEach(doc => {
				screams.push({
					screamId: doc.id,
					...doc.data(),
					// body: doc.data().body,
					// userHandle: doc.data().userHandle,
					// createdAt: doc.data().createdAt,
				});
			});
			return res.json(screams);
		})
		.catch(err => console.error(err));
});

// exports.getScreams = functions.https.onRequest((req, res) => {});

const createScream = (req, res) => {
	const newScream = {
		body: req.body.body,
		userHandle: req.body.userHandle,
		createdAt: new Date().toISOString(),
	};
	db.collection('screams')
		.add(newScream)
		.then(doc => {
			res.json({ message: `document ${doc.id} created successfully` });
		})
		.catch(err => {
			res.status(500).json({ error: `something went wrong` });
			console.log(err.message);
		});
};

app.post('/scream', createScream);
// https://baseurl.com/api/

// Signup Route

const signupUser = (req, res) => {
	const newUser = {
		email: req.body.email,
		password: req.body.password,
		confirmPassword: req.body.confirmPassword,
		handle: req.body.handle,
	};

	db.doc(`/users/${newUser.handle}`)
		.get()
		.then(doc => {
			if (doc.exists) {
				return res
					.status(400)
					.json({ message: `this handle ${handle} is already taken` });
			} else {
				return firebase
					.auth()
					.createUserWithEmailAndPassword(newUser.email, newUser.password);
			}
		})
		.then(data => {
			console.log(data);
			return data.user.getIdToken();
		})
		.then(token => {
			return res.status(201).json({ token });
		})
		.catch(err => {
			console.log(err);
			return res.status(500).json({ error: err.code });
		});
};

const isEmail = email => {
	const re =
		/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
	return re.test(String(email).toLowerCase());
};

const isEmpty = string => {
	if (string === '') return true;
	else return false;
};

// refactoring signupUser using async await syntacs
const signupUserAsync = async (req, res) => {
	const newUser = {
		email: req.body.email.trim(),
		password: req.body.password.trim(),
		confirmPassword: req.body.confirmPassword.trim(),
		handle: req.body.handle.trim(),
	};

	let errors = {};

	isEmpty(newUser.handle) && (errors.handle = 'handle must not be empty');

	if (Object.keys(errors).length > 0) {
		return res.status(400).json({ errors });
	}

	try {
		const doc = await db.doc(`/users/${newUser.handle}`).get();
		let token, userId;

		if (doc.exists) {
			return res
				.status(400)
				.json({ message: `this handle ${newUser.handle} is already taken` });
		} else {
			const data = await firebase
				.auth()
				.createUserWithEmailAndPassword(newUser.email, newUser.password);

			userId = data.user.uid;
			token = await data.user.getIdToken();

			const userCredentials = {
				handle: newUser.handle,
				email: newUser.email,
				createdAt: new Date().toISOString(),
				userId,
			};

			await db.doc(`/users/${newUser.handle}`).set(userCredentials);

			return res.status(201).json({ token });
		}
	} catch (err) {
		if (err.code == 'auth/email-already-in-use') {
			return res.status(400).json({ email: 'Email is already in use ' });
		} else {
			return res.status(500).json({ code: err.code, message: err.message });
		}
	}
};

app.post('/signup', signupUserAsync);

const login = async (req, res) => {
	const user = {
		email: req.body.email.trim(),
		password: req.body.password.trim(),
	};

	let errors = {};

	isEmpty(user.email) && (errors.email = 'email must not be empty');
	isEmpty(user.password) && (errors.password = 'password must not be empty');

	try {
		const data = await firebase
			.auth()
			.signInWithEmailAndPassword(user.email, user.password);
		const token = await data.user.getIdToken();

		return res.json({ token });
	} catch (error) {
		console.error(error);
		if (error.code === 'auth/user-not-found' || 'auth/wrong-password') {
			return res.status(403).json({ general: 'Wrong credentials' });
		}
		return res.status(500).json({ error: error.code });
	}

	// const token = await data.getIdToken();
};

// if (Object.keys(errors).length > 0) {
// 	return res.status(400).json(errors);
// }

app.post('/login', login);

exports.api = functions.https.onRequest(app);
