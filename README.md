# twee-mongoose-extension

![Twee.io Logo](https://raw.githubusercontent.com/tweeio/twee-framework/master/assets/68747470733a2f2f73332e65752d63656e7472616c2d312e616d617a6f6e6177732e636f6d2f6d657368696e2f7075626c69632f747765652e696f2e706e67.png)

[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/tweeio/twee-framework?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)
[![npm](https://img.shields.io/npm/dm/localeval.svg)](https://github.com/tweeio/twee-framework)
[![npm](https://img.shields.io/npm/l/express.svg)](https://github.com/tweeio/twee-framework)

Mongoose ODM Extension for Twee.io Framework - MVC Framework for Node.js and io.js based on Express.js.

Mongoose is [elegant mongodb object modeling for node.js](http://mongoosejs.com/)

Mongoose provides a straight-forward, schema-based solution to modeling your application data and includes built-in type casting, validation, query building, business logic hooks and more, out of the box.


*Lets agree that schema == model in our application.*


Installation
====


To install it in your Twee.IO application follow the instructions:


Edit `package.json` of your application:

```
"dependencies": {
    "twee-mongoose-extension": "*"
}
```


Enable extension in `application/configs/twee.js`:

```
module.exports = {
    "extensions": {
        "Mongoose": {
            "module": "twee-mongoose-extension"
        }
    }
};
```

Install dependencies:

```
$ npm install
```

It will install Mongoose for your application.


Run your application with command:

```
$ npm start
```

And you will see that extension has been loaded into project.


Configuration
====

Default configuration is following:

```
module.exports.config = {
    "databases": {
        "default": {
            "connection": "mongodb://localhost/tweeIoTest",
            "options": {}
        }
    },
    "defaultDatabase": "default",
    "modelsFolders": "models/mongoose/"
};
```


But you always able to change these settings in `application/configs/twee.js` file. For example

```
"extension": {
    "twee-mongoose": {
        "databases": {
            "myBusiness": {
                "connection": "mongodb://localhost/myBusiness"
            },
            "default": {
                "connection": "mongodb://localhost/anotherBusiness,mongodb://anotherHost.com/anotherBusiness",
                "options": {
                    // Multi-mongos support
                    "mongos": true
                }
            },
        },
        "defaultDatabase": "myBusiness"
    }
}
```

For more detailed instructions of how to pass options and construct connection string look at [Mongoose Connections Documentation](http://mongoosejs.com/docs/connections.html)

After that you're able to use these databases like this:

```
var Post = twee.get('mongoose').getModel('blog/Post', 'myBusiness');
var Post = twee.get('mongoose').getModel('blog/Post', 'default');
```

Where `blog` - is collection name, if you don't want collection to be named as `Post`, but `blog`.

Extension will look up the model in all the modules until it find first matched file. For example:
`modules/Blog/models/mongoose/PostModel.js`.

If you need to specify application module to search model in, then simple use this variant:

```
var Post = twee.get('mongoose').getModel('Default:blog/Post', 'default');
```

It will try to resolve model in `modules/Default/models/mongoose/PostModel.js`

If you don't want to specify custom collection name and you're agree that it will be `Post`, then you can use this format:

```
var Post = twee.get('mongoose').getModel('Default:Post', 'default');
```

or (to look up model in first matched file):

```
var Post = twee.get('mongoose').getModel('Post', 'default');
```

If you want to use default database `myBusiness` that has been specified in config, then use this format:

```
var Post = twee.get('mongoose').getModel('Post');
var Post = twee.get('mongoose').getModel('Default:Post');
```

If you need to specify subfolder for you'r model `modules/Default/models/mongoose/Posts/PostModel.js`

Then you should use this format:

```
var Post = twee.get('mongoose').getModel('Default:/Posts/Post');
// or
var Post = twee.get('mongoose').getModel('/Posts/Post');
```

If you want to specify for example `blog` collection name then you should write:

```
var Post = twee.get('mongoose').getModel('Default:blog/Posts/Post');
// or
var Post = twee.get('mongoose').getModel('blog/Posts/Post');
```


Creating Schemas
====

All the mongoose schemas should be placed in appropriate application modules folders. For example, if you have module named `Blog` then you should put your models in `modules/Blog/models/mongoose/` folder.

We need to place your mongoose schemas into `models/mongoose` folder because you're able to use all the rest of other database types with it's drivers and they should not conflict with mongoose schemas. They should look up theirs own schemas in appropriate folders. For example for Postgres driver all the postgres schemas should be placed in `modules/Blog/models/postgres/` folder.


The naming of models files follow the pattern: `modules/Blog/models/mongoose/<UppercasedModelName>Model.js`

For example for `User` model it should be `.../mongoose/UserModel.js`.

Extension will not recognise another pattern, because it is great practice to name the files according it's destiny. You will always know that if the filename is `UserModel.js` - then it's probably a schema of some database.

Lets create `Post` model in `modules/Blog/models/mongoose/PostModel.js`:

```
module.exports.schema = function(mongoose) {
    var Schema = mongoose.Schema;

    return new Schema({
        title:  String,
        author: String,
        body:   String,
        comments: [{ body: String, date: Date }],
        date: { type: Date, default: Date.now },
        hidden: Boolean,
        meta: {
            votes: Number,
            favs:  Number
        }
    })
};
```


How to use it from controller. Let's say that we have `DefaultController.js`:

```
"use strict";

module.exports = function () {

    this.indexAction = function (req, res) {
        var self = this;

        var Post = twee.get('mongoose').getModel('posts/Post');
        var post = new Post({
            title:  'Mongoose Title',
            author: 'Dmitri',
            body:   'some big blog post text',
            comments: [{ body: 'my comment', date: new Date() }],
            date: { type: Date, default: Date.now },
            hidden: false
        });

        post.save(function(err, u){
            console.log(err, u);
        });

        Post.find({}, function(err, records){
            res.render('Default/views/pages/Default/index', {posts: records});
        });
    }
};

```

We can see that we are able to use all the Mongoose functionality, create records, fetch them according to [Mongoose API](http://mongoosejs.com/docs/api.html#query_Query-find)

If you want to use nested schemas, then you can use following format to declare [nested schemas](http://mongoosejs.com/docs/api.html#schema_Schema) using `twee-mongoose-extension`:

```
module.exports.schema = function(mongoose) {
    var Schema = mongoose.Schema;

    return new Schema({
        title:  String,
        author: String,
        body:   String,
        comments: [{ body: String, date: Date }],
        date: { type: Date, default: Date.now },
        hidden: Boolean,
        meta: {
            votes: Number,
            favs:  Number
        },
        comment: [twee.get('mongoose').getDefinition('posts/Comment')]
    })
};

```

You can see that it works as expected:

![Twee.IO Mongoose Extension](https://raw.githubusercontent.com/tweeio/screenshots/master/twee-mongoose-extension-db-view.png)

If you need to get connection object, then you're able to get access to hash-object that contains connections:

```
twee.get('mongoose').databases
```

Keys of databases object are the same as in databases config.


LISENCE
====

MIT
