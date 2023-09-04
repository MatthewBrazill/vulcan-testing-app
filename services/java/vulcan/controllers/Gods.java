package vulcan.controllers;

import java.util.HashMap;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.ResponseBody;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Controller
public class Gods {
    @ResponseBody
    @RequestMapping(value = "/gods/create", method = RequestMethod.POST)
    public HashMap<String, Object> godCreateAPI(HttpServletRequest req, HttpServletResponse res) {
        return null;
    }

    @ResponseBody
    @RequestMapping(value = "/gods/get", method = RequestMethod.POST)
    public HashMap<String, Object> godGetAPI(HttpServletRequest req, HttpServletResponse res) {
        return null;
    }

    @ResponseBody
    @RequestMapping(value = "/gods/update", method = RequestMethod.POST)
    public HashMap<String, Object> godUpdateAPI(HttpServletRequest req, HttpServletResponse res) {
        return null;
    }

    @ResponseBody
    @RequestMapping(value = "/gods/delete", method = RequestMethod.POST)
    public HashMap<String, Object> godDeleteAPI(HttpServletRequest req, HttpServletResponse res) {
        return null;
    }
}
