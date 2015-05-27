//setup mogoDB on the server
//create client side cache connected to server collection
Tasks = new Mongo.Collection("tasks"); 

if (Meteor.isClient) {
  Meteor.subscribe("tasks");
 //this code only runs on the client
 Template.task.helpers({
  isOwner: function () {
    return this.owner === Meteor.userId();
  }
 });

  Template.body.helpers({

    tasks: function () {
      if (Session.get("hideCompleted")) {
        //if hide completed is checked, filter tasks
        return Tasks.find({checked: {$ne: true}}, {sort: {createdAt: -1}});
      } else {
        //otherwise return all of the tasks
        return Tasks.find({}, {sort: {createdAt: -1}});
      }
    },

    hideCompleted: function () {
      return Session.get("hideCompleted");
    },

    incompleteCount: function () {
      return Tasks.find({checked: {$ne: true}}).count();
    }

  });

  Template.body.events({
    "change .hide-completed input": function (event) {
      Session.set("hideCompleted", event.target.checked);
    },

    "submit .new-task": function (event) {
    //this function is called when the form is submitted
    var text = event.target.text.value;

    Meteor.call("addTask", text);

    //Clear form
    event.target.text.value = "";
    //prevent default form submit
    return false;

    },

    "click .toggle-private": function () {
      Meteor.call("setPrivate", this._id, ! this.private);
    }

});

  Template.task.events({

     "click .toggle-checked": function () {
      //set the checked property to the opposite of its current value
      Meteor.call("setChecked", this._id, ! this.checked); 
    },
    "click .delete": function () {
      Tasks.remove(this._id);
      Meteor.call("deleteTask", this._id);

    }
  });

  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
  });

}

Meteor.methods({
  addTask: function (text) {
    // Make sure the user is logged in before inserting text
    if ( ! Meteor.userId()) {
      throw new Meteor.Error("You are not authorized");
    }

    Tasks.insert({
      text: text,
      createdAt: new Date(),
      owner: Meteor.userId(),
      username: Meteor.user().username
    });

  },

  deleteTask: function (taskId) {
    Tasks.remove(taskId);

    var task = Tasks.findOne(taskId);
    if (task.private && task.owner !== Meteor.userId()) {
      //If the task is private make sure only the owner can delete it
      throw new Meteor.Error("not-authorized");
    }

  },

  setChecked: function (taskId, setChecked) {
    Tasks.update(taskId, {$set: { checked: setChecked} });

    var task = Tasks.findOne(taskId);
    if (task.private && task.owner !== Meteor.userId()) {
      //If the task is private make sure only the owner can check it off
      throw new Meteor.Error("not-authorized");

    }
  },

  setPrivate: function (taskId, setToPrivate) {
    var task = Tasks.findOne(taskId);
    if (task.owner !==Meteor.userId()){
      throw new Meteor.Error("not-authorized");
    }
    Tasks.update(taskId, { $set: { private: setToPrivate } });
  }

});

if (Meteor.isServer) {
  // Only publish tasks that are public or belong to the current user 
  Meteor.publish("tasks", function () {
    return Tasks.find({
    $or: [
      { private : {$ne: true} },
      { owner: this.userId }
    ]
   });
 });
}

