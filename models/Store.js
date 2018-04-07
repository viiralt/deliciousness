const mongoose = require('mongoose');
mongoose.Promise = global.Promise; // bind to ES6 promises in order to use async await
const slug = require('slugs');

const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true, // remove whitespaces
    required: 'Please enter a store name'
  },
  description: {
    type: String,
    trim: true
  },
  created: {
    type: Date,
    default: Date.now
  },
  location: {
    type: {
      type: String,
      default: 'Point'
    },
    coordinates: [{
      type: Number, 
      required: 'Please provide coordinates'
    }],
    address: {
      type: String,
      required: 'Please provide an address'
    }
  },
  tags: [String], // an array of strings
  slug: String,
  photo: String,
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'User', // relationship
    required: 'Please provide an author'
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// define our indexes
storeSchema.index({
  name: 'text',
  description: 'text'
});

storeSchema.index({ location: '2dsphere' });

storeSchema.pre('save', async function (next) {
  if(!this.isModified('name')) {
    return next();
  }
  this.slug = slug(this.name);
  // find stores with duplicate slugs
  const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i'); // searching for urls that start with this.slug and might end with -1 -9, etc

  const storesWithSlug = await this.constructor.find({ slug: slugRegEx });

  if (storesWithSlug.length) {
    this.slug = `${this.slug}-${storesWithSlug.length + 1}`; // if monkey-bar exists, slug will be monkey-bar-2, etc. increment by 1
  }
  next();
  // TODO: make more resilient so slugs are always unique
});

storeSchema.statics.getTagsList = function () {
  return this.aggregate([
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } } }, // group based on tag and create a new field called count, sum is incremented by 1 with each iteration
    { $sort: { count: -1 } } 
  ]); 
};

storeSchema.statics.getTopStores = function () {
  return this.aggregate([
    // populate reviews for stores
    { $lookup: { from: 'reviews', localField: '_id', foreignField: 'store', as: 'reviews' }},
    // filter for items with at least 2 reviews
    { $match: { 'reviews.1': { $exists: true }}},
    // add average reviews field
    { $project: {
      photo: '$$ROOT.photo',
      name: '$$ROOT.name',
      reviews: '$$ROOT.reviews',
      slug: '$$ROOT.slug',
      averageRating: { $avg: '$reviews.rating' }
    }},
    // sort by rating
    { $sort: { averageRating: -1 }}, // -1 === highest to lowest
    // limit to 10 hits
    { $limit: 10 }
  ]);
};

storeSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'store'
});

function autopopulate(next) {
  this.populate('reviews');
  next();
}

storeSchema.pre('find', autopopulate);
storeSchema.pre('findOne', autopopulate);

module.exports = mongoose.model('Store', storeSchema);