import React, { Component } from 'react';
import './css/Main.css';
import Month from './calendar/Month.js';
import Week from './calendar/Week.js';
import Day from './calendar/Day.js';
import "date-format-lite";

var daysInMonth = [
           [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
           [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]];

class Main extends Component {

   constructor (props) {
      super(props);
      this.state = {
         viewDate: null,
         currentDate: null
      }
   }

   componentDidMount() {
      let date = new Date();
      this.setState({ currentDate: date, viewDate: date.format("YYYY-MM-DD") });
   }

  render(){
      let mainCal = <div />
      if(this.props.user){
         mainCal = (
            <div className="main-page">
               <Month viewDate={this.state.viewDate} currentDate={this.state.currentDate}/>
               <Week viewDate={this.state.viewDate} currentDate={this.state.currentDate}/>
               <Day viewDate={this.state.viewDate} currentDate={this.state.currentDate}/>
            </div>
         );
      } else {
         mainCal = <div className="main-no-user"><h1>Please login or signup.</h1></div>
      }
      return (
        <div className="main-home">
          {mainCal}
        </div>
      );
   }

}

export default Main;
