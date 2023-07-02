const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

const app = express();
const port = 8000;
const mongoUrl =
  "mongodb+srv://daniel752:Diego752!@todolistdb.cirph5k.mongodb.net/?retryWrites=true&w=majority";
const Schema = mongoose.Schema;

mongoose.connect(mongoUrl, { useNewUrlParser: true });

const itemSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
});

const CategorySchema = new Schema({
  name: { type: String, required: true },
  items: [{ type: Schema.Types.ObjectId, ref: "Item" }],
});

const Item = mongoose.model("Item", itemSchema);
const Category = mongoose.model("Category", CategorySchema);

const categories = [];

function getFormattedDate(date) {
  const options = {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  };

  return date.toLocaleDateString("en-US", options);
}

function addCategoryToList(newCategory) {
  var category = new Category({ name: newCategory });
  category
    .save()
    .then((savedCategory) => {
      console.log(`Saved category ${savedCategory}`);
    })
    .catch((err) => {
      console.log(err);
    });
  categories.push(category);
}

async function addItemToList(newItem, categoryName) {
  const category = await Category.findOne({ name: categoryName })
    .populate("items")
    .exec();
  console.log(newItem);
  const item = new Item({ name: newItem });
  item.category = category._id; // Associate the item with the category
  const savedItem = await item.save();
  category.items.push(savedItem);
  console.log(category.items);
  await category.save();
  return category.items;
}

function handleError(err, type, name) {
  if (err) {
    console.log(err);
  } else {
    console.log(`Added ${type} ${name} to DB`);
  }
}

async function getCategoriesFromDB() {
  try {
    const categoryCollection = await Category.find({});
    return categoryCollection;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

async function getCategoryItemsFromDB(requestedCategory) {
  const category = await Category.findOne({ name: requestedCategory })
    .populate("items")
    .exec();
  console.log(category.items);
  return category.items;
  // try {
  //   const category = await Category.findOne({
  //     name: requestedCategory,
  //   })
  //     .populate("items")
  //     .exec();
  //   console.log(category.items);
  //   return category.items;
  // } catch (error) {
  //   console.log(error);
  //   throw error;
  // }
}

app.set("view engine", "ejs");

app.use(express.static("public"));

app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", async function (req, res) {
  try {
    var date = new Date();
    const categoryCollection = await getCategoriesFromDB();
    res.render("index", {
      date: getFormattedDate(date),
      categories: categoryCollection,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/", function (req, res) {
  var category = req.body.newCategory;
  addCategoryToList(category);
  res.redirect("/");
});

app.get("/categories/:category", async function (req, res) {
  try {
    const requestedCategory = req.params.category;
    console.log(`Requested category: ${requestedCategory}`);
    const items = await getCategoryItemsFromDB(requestedCategory);
    res.render("list", {
      listTitle: requestedCategory,
      items: items,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/categories/:category", async function (req, res) {
  try {
    const categoryName = req.body.listTitle;
    const item = req.body.newItem;
    console.log(`New item to add: ${item}`);
    const items = await addItemToList(item, categoryName);
    res.render("list", {
      listTitle: categoryName,
      items: items,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/delete", async function (req, res) {
  if (req.body.itemCheckbox) {
    const checkedCategoryId = req.body.itemCheckbox;
    console.log(checkedCategoryId);
    const category = await Category.findById(checkedCategoryId, "items").exec();
    const ids = [];
    category.items.forEach((item) => {
      ids.push(item._id.toString());
    });
    Item.deleteMany({ _id: { $in: ids } }).exec();
    Category.deleteOne({ _id: checkedCategoryId }).exec();
    res.redirect("/");
  }
});

app.post("/categories/:category/delete", async function (req, res) {
  if (req.body.itemCheckbox) {
    const checkedItemId = req.body.itemCheckbox;
    const categoryName = req.body.categoryName;
    await Item.findByIdAndDelete(checkedItemId).exec();
    res.redirect(`/categories/${categoryName}`);
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
