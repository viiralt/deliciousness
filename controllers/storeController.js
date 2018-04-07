const mongoose = require('mongoose');
const Store = mongoose.model('Store'); // referencing the Store schema
const User = mongoose.model('User');
const multer = require('multer'); // handle enctype='multipart/form-data' for uploading files
const jimp = require('jimp'); // image resizer
const uuid = require('uuid'); // create unique identifiers for each image
const multerOptions = { // store og photo in mem, resize and save the resized ver
  storage: multer.memoryStorage(),
  fileFilter(req, file, next) {
    const isPhoto = file.mimetype.startsWith('image/');
    if(isPhoto) {
      next(null, true); // callback with null as first arg and valid second value, it indicates everything is AOK
    } else {
      next({ message: 'That file type is not allowed' });
    }
  }
};


exports.homePage = (req, res) => {
  res.render('index');
};

exports.upload = multer(multerOptions).single('photo'); // middleware to handle img uploads

exports.resize = async (req, res, next) => {
  // check if there is no new photo to resize
  if (!req.file) {
    return next();
  } 
  const extension = req.file.mimetype.split('/')[1]; // imetype: 'image/jpeg' index 1 gives the extension
  req.body.photo = `${uuid.v4()}.${extension}`; // '416ac246-e7ac-49ff-93b4-f7e94d997e6b'
  // now resize
  const photo = await jimp.read(req.file.buffer); // jimp returns a promise
  await photo.resize(800, jimp.AUTO); // width 800px, height auto
  await photo.write(`./public/uploads/${req.body.photo}`);
  // once written to file system, keep going
  next();
};

exports.addStore = (req, res) => {
  res.render('editStore', { title: 'Add store' });
};

exports.createStore = async (req, res) => { // mark func as async
  req.body.author = req.user._id;
  const store = await (new Store(req.body)).save(); // create and save a store to the db, which returns a promise and we await for it to resolve before moving on
  req.flash('success', `Successfully created ${store.name}. Care to leave a review?`);
  res.redirect(`/store/${store.slug}`);
};

exports.getStores = async (req, res) => {
  const page = req.params.page || 1;
  const limit = 6;
  const skip = (page * limit) - limit;
  // 1. query the db for all stores
  const storesPromise = Store
    .find() // returns a promise, need to await
    .skip(skip)
    .limit(limit)
    .sort({ created: 'desc' });

  const countPromise = Store.count();
  const [stores, count] = await Promise.all([storesPromise, countPromise]);
  const pages = Math.ceil(count / limit);

  if(!stores.length && skip) {
    req.flash('info', `Apologies, but page ${page} doesn't exist. You have been redirected to page ${pages} instead.`);
    res.redirect(`/stores/page/${pages}`);
    return;
  } 

  res.render('stores', { title: 'Stores', stores, page, pages, count }); // pass stores data to the template so we can loop over it and render out!
};

const confirmOwner = (store, user) => {
  if (!store.author.equals(user._id)) {
    throw Error('You are not authorised to edit this store');
  }
};

exports.editStore = async (req, res) => {
  const store = await Store.findOne({ _id: req.params.id }); 
  confirmOwner(store, req.user);
 
  res.render('editStore', { title: `Edit ${store.name}`, store });
};

exports.updateStore = async (req, res) => {
  // set location data to be a point
  req.body.location.type = 'Point';
  // find and update the store
  const store = await Store.findOneAndUpdate({ _id: req.params.id }, req.body, {
    new: true, // return the updated version of the store
    runValidators: true // enforces the requirements of the Store schema, no-undeclare
  }).exec(); // makes sure new and runValidators will execute
  // redirect user to store and success
  req.flash('success', `Successfully updated <strong>${store.name}</strong>. <a href="/stores/${store.slug}">View store</a>`);
  res.redirect(`/stores/${store._id}/edit`);
};

exports.getStoreBySlug = async (req, res, next) => {
  /* res.send('it works'); */
  const store = await Store.findOne({ slug: req.params.slug }).populate('author reviews');
  /* res.json(req.params); */
  /* res.json(store); */
  if (!store) return next(); // error handling: if store not found 404
  res.render('store', { store, title: store.name });
};

exports.getStoresByTag = async (req, res) => {
  const tag = req.params.tag;
  const tagQuery = tag || { $exists: true };

  const tagsPromise = Store.getTagsList();
  const storesPromise = Store.find({ tags: tagQuery });
  const [tags, stores] = await Promise.all([tagsPromise, storesPromise]);

  res.render('tag', { tags, title: 'Tags', tag, stores });
};

exports.searchStores = async (req, res) => {
  const stores = await Store
  .find({
    $text: {
      $search: req.query.q,
    }
  }, {
    score: { $meta: 'textScore' }
  })
  .sort({
    score: { $meta: 'textScore' }
  })
  .limit(5);
  res.json(stores);
};

exports.mapStores = async (req, res) => {
  const coordinates = [req.query.lng, req.query.lat].map(parseFloat); // str to nums
  /* res.json({ it: 'worked' }); */
  const query = {
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates
        },
        $maxDistance: 10000 // 10 clicks
      }
    }
  };

  const stores = await Store.find(query).select('slug name description location photo').limit(10); // select only necessary props, limit to 10 hits
  res.json(stores);
};

exports.mapPage = (req, res) => {
  res.render('map', { title: 'Map' });
};

exports.heartStore = async (req, res) => {
  const hearts = req.user.hearts.map(obj => obj.toString());
  const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet'; 
  const user = await User
    .findByIdAndUpdate(req.user._id,
      { [operator]: { hearts: req.params.id }},
      { new: true }
    );
  res.json(user);
};

exports.getHearts = async (req, res) => {
  const stores = await Store.find({
    _id: { $in: req.user.hearts }
  });
  res.render('stores', { title: 'Hearted stores', stores });
};

exports.getTopStores = async (req, res) => {
  const stores = await Store.getTopStores();
  res.render('topStores', { stores, title: 'Top stores' });
};