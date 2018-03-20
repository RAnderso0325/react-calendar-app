require("dotenv").config();
var express = require("express");
var path = require("path");
var favicon = require("serve-favicon");
var logger = require("morgan");
var bodyParser = require("body-parser");
var express = require("express");
var router = express.Router();
var mongoose = require("mongoose");
var User = require("../models/user");
var Calendar = require('../models/calendar').Calendar;
var CalEvent = require('../models/calendar').CalEvent;
var Mongoose = require("mongoose");
require('date-format-lite');

//TODO: all calendar get calls should go through a single function

function makeNewCalendar(user, callback) {
   var userCalendar = {};
   Calendar.create({
     name: 'My Calendar',
     userId: user._id,
     eventTypes: [{eventTypeId: 0, name: 'Holiday'},{eventTypeId: 1, name: 'Meeting'},{eventTypeId: 2,name: 'Work'},{eventTypeId:3, name:'Appointment'},{eventTypeId: 4, name: 'Birthday'}],
     people: [{
       userId: user._id,
       permission: 'edit'
     }]
   }, function(err, calendar){
     if (err){
       console.log('Cal DB create error: ', err);
       //res.status(500).send({error: true, message: 'Calendar Database Error - ' + err.message});
       return callback( err, null, null);
     }

     //--write calendar id back to user
     userCalendar = calendar;
     console.log("makeNewCalendar:");
     if(user.calendars) {
      //   user.calendars.push({calendarId: calendar._id});
      console.log('did this cal add...from push');
      // console.log(userCalendar);
      console.log(userCalendar._id);
         User.update({_id: user.id},{$push: {
           calendars: {calendarId: userCalendar._id}
          }}, function(err,userCalendar){
            if(err){
              console.log(err)
            }
				return callback(null, user, userCalendar);
          }); //TODO: return function that return callback with calendar
     } else {
       console.log("did this cal add...from set");
       //console.log(userCalendar);
       //console.log(userCalendar._id);
      //   user.calendars = [{calendarId: calendar._id}];
         User.update({_id: user.id},{$addToSet: {
           calendars: {calendarId: userCalendar._id}
          }}, function(err,userCalendar){
            if(err){
              console.log(err)
            }
				return callback(null, user, userCalendar);
          });
     }
   })
}

//-- do not return entire calendar, no events
function getUserCalendar(user, callback) {
   var userCalendar = {};
   //-- user must always have a calendar[0]
   if(!user.calendars || !user.calendars[0]) {
      makeNewCalendar(user, function(err, calendar) {
         if(err) {
            console.log("db error: could not make new calendar: ",err);
            return callback( err, null);
         } else {
            Calendar.findOne({_id: calendar._id}).select({events:0}).exec( function(err, calendar){
               if(err){
                  console.log('DB error - calendar not found: ', err);
                  return callback( err, null);
               }

               callback(null, calendar);
            });
         }
      });
   } else {
      Calendar.findOne({_id: user.calendars[0].calendarId}).select({events:0}).exec(function(err, calendar){
         if(err){
            console.log('DB error - calendar not found: ', err);
            return callback( err, null);
         }
         callback(null, calendar);
      });

   }
}

router.post('/all', function(req,res,next){
    console.log(req.body);
    User.aggregate([
        {$match: {_id: Mongoose.Types.ObjectId(req.body.user.id)}},
        {$unwind: "$calendars"},
	  ], function(err, calendars) {
				if(err){
					console.log(err);
				}
            res.json({calendars: calendars});
		  });
});

router.post('/oneCal',function(req,res,next){
    console.log(req.body);
    Calendar.findOne({_id: req.body.calendarId},function(err,calendar){
        if(err){
            console.log(err)
        }
        let cal = calendar.name;
        let calId = calendar._id;
        res.json({name: cal, _id: calId});
    });
});

router.post('/add', function(req,res,next){
    var userCalendar = {};
    Calendar.create({
        name: req.body.name,
        userId: req.body.user.id,
        eventTypes: [{eventTypeId: 0, name: 'Holiday'},{eventTypeId: 1, name: 'Meeting'},{eventTypeId: 2,name: 'Work'},{eventTypeId:3, name:'Appointment'},{eventTypeId: 4, name: 'Birthday'}],
        people: [{
            userId: req.body.user.id,
            permission: 'edit'
        }]
    }, function(err, calendar){
        if (err){
            console.log('Cal DB create error: ', err);
        }
        userCalendar = calendar;
        console.log("makeNewCalendar:",calendar);
        User.findOne({_id: req.body.user.id},function(err,user){
            if(user.calendars) {
                User.update({_id: req.body.user.id},{$push: {
                    calendars: {calendarId: userCalendar._id}
                }}, function(err,userCalendar){
                    if(err){
                        console.log(err)
                    }
                });
            } else {
                console.log("did this cal add...from set");
                User.update({_id: req.body.user.id},{$addToSet: {
                    calendars: {calendarId: userCalendar._id}
                }}, function(err,userCalendar){
                    if(err){
                        console.log(err)
                    }
                });
            }
        });
    });
});

router.post('/addHoliday', function(req, res, next){
	console.log("POST /calendar/addHoliday");

	User.findOne({_id: req.body.user.id}, function(err, user) {
		if(err){
	     	console.log(err);
        }
        Calendar.findOne({_id: req.body.calendar._id, people: {$elemMatch: {userId: req.body.user.id}}}, function(err, calendar){
            if(err){
                console.log(err);
            }
            if(calendar.people[0].permission === "edit"){
                let holidays = req.body.holidays;
                holidays.map((holiday) => {
                    let holiName = holiday.name;
                    let holiStart = Number(holiday.start.date('U'));
                    let startTime = holiday.start.date("HH:MM");
                    let holiEnd = Number(holiday.end.date('U'));
                    let endTime = holiday.end.date("HH:MM");
                  //   console.log('start', holiStart, typeof holiStart);
                    let holiType = holiday.type;
                    if(calendar.events){
                        Calendar.update({ _id: calendar._id },
                            { $push: {
                                events: {
                                    name: holiName,
                                    startDate: holiEnd,
                                    startTime: startTime,
                                    endDate: holiEnd,
                                    endTime: endTime,
                                    priority: 0,
                                    icon: holiName,
                                    eventTypeId: 0
                                }
                            }
                        }, function(err, newEvent){
                            if(err){
                                console.log(err);
                            }
                        });
                    }else{
                        Calendar.update({ _id: calendar_id },
                            { $addToSet: {
                                events: {
                                    name: holiName,
                                    startDate: holiEnd,
                                    startTime: startTime,
                                    endDate: holiEnd,
                                    endTime: endTime,
                                    priority: 0,
                                    icon: holiName,
                                    eventTypeId: 0
                                }
                            }
                        }, function(err, newEvent){
                            if(err){
                                console.log(err);
                                console.log('we don know');
                            }
                        });
                    }
                });
            }
        }).then(function(updatedCalendar){
            // res.json({calendar: updatedCalendar});
            // console.log('hi from the new cal');
            // console.log(updatedCalendar);
            Calendar.findOne({_id: updatedCalendar._id}, function(err,calendar){
                if(err){
                    console.log(err);
                    console.log('error in the second cal db call');
                }
                res.json({calendar: calendar});
            });
        });
	});
});

router.post('/edit', function(req,res,next){
    Calendar.findOne({_id: req.body.calendarId}, function(err, calendar){
        if(err){
            console.log(err);
        }
        if(calendar.userId == req.body.user.id){
            var newContributor = {};
            User.findOne({email: req.body.email}, function(err,contributor){
                newContributor = contributor;
                if(newContributor._id){
                    if(calendar.people){
                        Calendar.update({_id: calendar._id},{
                            $push:
                                {people:{userId:newContributor._id, permission:req.body.permission}}
                        },function(err,newPerson){
                            if(err){
                                console.log(err)
                            }
                            console.log(newPerson);
                        });
                    }else{
                        Calendar.update({_id: calendar._id},{
                            $addToSet:
                                {people:{userId:newContributor._id, permission:req.body.permission}}
                        },function(err,newPerson){
                            if(err){
                                console.log(err)
                            }
                            console.log(newPerson);
                        });
                    }
                    User.update({email: req.body.email},{$push:{calendars:{calendarId: req.body.calendarId}}},function(err,updatedUser){
                        if(err){
                            console.log(err);
                        }
                        console.log(updatedUser);
                    });
                }
            });
        }
        if(calendar.people){
            for(let i=0; i<calendar.people.length; i++){
                if(calendar.people[i].userId == req.body.user.id && calendar.people[i].permission == 'edit'){
                    var newContributor = {};
                    User.findOne({email: req.body.email}, function(err,contributor){
                        if(err){
                            res.status(500).send({error: true, message: 'user does not have an account yet! '+err.message});
                        }
                        newContributor = contributor;
                        if(newContributor._id){
                            Calendar.update({_id: calendar._id},{$push:{people:{userId:newContributor._id, permission:req.body.permission}}},function(err,newContributor){
                                if(err){
                                    console.log(err);
                                }
                            });
                            res.json({newContributor: newContributor});
                        }else{
                            res.status(500).send({error: true, message: err.message});
                        }
                    });
                }else{
                    res.status(500).send({error: true, message: error.message});
                }
            }
        }else{
            res.status(500).send({error: true, message: 'user does not have permission to edit! '+err.message});
        }
    });
});

router.post('/editName', function(req,res,next){
    Calendar.findOne({_id: req.body.calendar},function(err,calendar){
        if(err){
            console.log(err);
        }
        if(calendar.userId == req.body.user.id){
            Calendar.update({_id: req.body.calendar},{$set: {name: req.body.name}},function(err,updatedCalendar){
                if(err){
                    console.log(err);
                }
                res.json({updatedCalendar: updatedCalendar});
            })
        }else if(calendar.people){
            for(let i=0; i<calendar.people.length; i++){
                if(calendar.people[i].userId == req.body.user.id && calendar.people[i].permission == 'edit'){
                    Calendar.update({_id: req.body.calendar},{$set:{name: req.body.name}},function(err,updatedCalendar){
                        if(err){
                            console.log(err);
                        }
                        res.json({updatedCalendar: updatedCalendar});
                    });
                }
            }
        }else{
            res.status(500).send({error: true, message: 'you do not have edit permissions! '+error.message});
        }
    });
});


module.exports = {router, getUserCalendar, makeNewCalendar};
