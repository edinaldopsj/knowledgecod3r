import "font-awesome/css/font-awesome.css";
import Vue from "vue";

import App from "./App";

import "./config/bootstrap";
import "./config/msgs";
import store from "./config/store";
import router from "./config/router";

Vue.config.productionTip = false;

// Temporario
require("axios").defaults.headers.common["Authorization"] =
  "bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6MSwibmFtZSI6IkVkaW5hbGRvIFBpbyBKUiIsImVtYWlsIjoiZWRpbmFsZG9wc2o5MkBnbWFpbC5jb20iLCJhZG1pbiI6dHJ1ZSwiaWF0IjoxNTc0MDE2NDcxLCJleHAiOjE1NzQyNzU2NzF9.Qp8cgJRBQhj-y_38ZWMpWLFvbJ8StrLFVzVc22uc4ik";

new Vue({
  store,
  router,
  render: h => h(App)
}).$mount("#app");
