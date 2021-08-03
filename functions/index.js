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

// refactoring signupUser using async await syntacs
const signupUserAsync = async (req, res) => {
	const newUser = {
		email: req.body.email,
		password: req.body.password,
		confirmPassword: req.body.confirmPassword,
		handle: req.body.handle,
	};

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

exports.api = functions.https.onRequest(app);
