import { updateLo } from "../utils/course-utils";
import type { Lo } from "../types/lo-types";
import type { Course } from "../models/course";
import type { User } from "../types/auth-types";
import { currentCourse, currentUser } from "../stores/stores";

import { readValue, sanitise, updateCalendar, updateCount, updateCountValue, updateLastAccess, updateStr, updateVisits } from "tutors-reader-lib/src/utils/firebase-utils";

let course: Course;
let user: User;

currentCourse.subscribe((current) => {
  course = current;
});
currentUser.subscribe((current) => {
  user = current;
});

export const analyticsService = {
  courseId: "",
  courseUrl: "",
  loRoute: "",
  title: "",
  lo: <Lo>{},

  learningEvent(params: Record<string, string>, data: Record<string, string>) {
    this.courseUrl = params.courseid;
    if (this.courseUrl.includes(".")) {
      this.courseId = params.courseid.substring(0, params.courseid.indexOf("."));
    } else {
      this.courseId = params.courseid;
    }
    this.loRoute = "";
    if (params.loid) {
      this.loRoute = sanitise(params.loid);
    }
    this.lo = data.lo;
    if (this.lo) {
      this.title = this.lo.title;
    } else {
      this.title = course.lo.title;
    }
    this.reportPageLoad();
  },

  setOnlineStatus(status: boolean) {
    if (!user) return false;
    const key = `${this.courseId}/users/${sanitise(user.email)}/onlineStatus`;
    if (status) {
      updateStr(key, "online");
      user.onlineStatus = "online";
    } else {
      updateStr(key, "offline");
      user.onlineStatus = "offline";
    }
  },

  async getOnlineStatus(course: Course, user: User): Promise<string> {
    let status = "online";
    if (course && user) {
      this.user = user;
      this.courseId = course.url.substring(0, course.url.indexOf("."));
      const key = `${this.courseId}/users/${sanitise(user.email)}/onlineStatus`;
      status = await readValue(key);
      if (status == null) {
        status = "online";
      }
    }
    return status;
  },

  reportPageLoad() {
    updateLastAccess(`${this.courseId}/usage/${this.loRoute}`, this.title);
    updateVisits(this.courseId);

    if (!user || (user && user.onlineStatus === "online")) {
      updateLastAccess(`all-course-access/${this.courseId}`, this.title);
      updateVisits(`all-course-access/${this.courseId}`);
      updateLo(`all-course-access/${this.courseId}`, course, this.lo);
    }

    if (user) {
      const key = `${this.courseId}/users/${sanitise(user.email)}/${this.loRoute}`;
      updateLastAccess(key, this.lo.title);
      updateVisits(key);
    }
  },

  updatePageCount() {
    updateLastAccess(`${this.courseId}/usage/${this.loRoute}`, this.title);
    updateCount(this.courseId);
    updateCount(`all-course-access/${this.courseId}`);
    if (user) {
      const key = `${this.courseId}/users/${sanitise(user.email)}/${this.loRoute}`;
      updateLastAccess(key, this.title);
      updateCount(key);
      updateCalendar(`${this.courseId}/users/${sanitise(user.email)}`);
    }
  },

  updateLogin(courseId: string, user: User) {
    const key = `${courseId}/users/${sanitise(user.email)}`;
    updateStr(`${key}/email`, user.email);
    updateStr(`${key}/name`, user.name);
    updateStr(`${key}/id`, user.userId);
    updateStr(`${key}/nickname`, user.nickname);
    updateStr(`${key}/picture`, user.picture);
    updateStr(`${key}/last`, new Date().toString());
    updateCountValue(`${key}/count`);
  }
};
