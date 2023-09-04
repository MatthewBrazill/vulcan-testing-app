package vulcan.controllers;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.ResponseBody;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import vulcan.Helpers;

@Controller
public class Storage {
    @RequestMapping(value = "/storage", method = RequestMethod.GET)
    public String storagePage(HttpServletRequest req, HttpServletResponse res, Model model) {
        String perms = Helpers.authenticate(req);
        switch (perms) {
            case "user":
            case "admin":
                model.addAttribute("title", "God Storage");
                model.addAttribute("language", "Java");
                res.setStatus(HttpServletResponse.SC_OK);
                return "storage";

            case "no_auth":
                try {
                    res.setStatus(HttpServletResponse.SC_FOUND);
                    res.sendRedirect("/login");
                    return null;
                } catch (Exception e) {
                    res.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                    return "error";
                }

            default:
                model.addAttribute("title", "Error");
                model.addAttribute("language", "Java");
                model.addAttribute("statusCode", "500");
                model.addAttribute("message", "There was an issue with the Server, please try again later.");
                res.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                return "error";
        }
    }

    @RequestMapping(value = "/add", method = RequestMethod.GET)
    public String addGodPage(HttpServletRequest req, HttpServletResponse res, Model model) {
        String perms = Helpers.authenticate(req);
        switch (perms) {
            case "user":
            case "admin":
                model.addAttribute("title", "Add God");
                model.addAttribute("language", "Java");
                res.setStatus(HttpServletResponse.SC_OK);
                return "add_god";

            case "no_auth":
                try {
                    res.setStatus(HttpServletResponse.SC_FOUND);
                    res.sendRedirect("/login");
                    return null;
                } catch (Exception e) {
                    res.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                    return "error";
                }

            default:
                model.addAttribute("title", "Error");
                model.addAttribute("language", "Java");
                model.addAttribute("statusCode", "500");
                model.addAttribute("message", "There was an issue with the Server, please try again later.");
                res.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                return "error";
        }
    }

    @RequestMapping(value = "/edit", method = RequestMethod.GET)
    public String editGodPage(HttpServletRequest req, HttpServletResponse res, Model model) {
        String perms = Helpers.authenticate(req);
        switch (perms) {
            case "user":
            case "admin":
                model.addAttribute("title", "Edit God");
                model.addAttribute("language", "Java");
                res.setStatus(HttpServletResponse.SC_OK);
                return "edit_god";

            case "no_auth":
                try {
                    res.setStatus(HttpServletResponse.SC_FOUND);
                    res.sendRedirect("/login");
                    return null;
                } catch (Exception e) {
                    res.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                    return "error";
                }

            default:
                model.addAttribute("title", "Error");
                model.addAttribute("language", "Java");
                model.addAttribute("statusCode", "500");
                model.addAttribute("message", "There was an issue with the Server, please try again later.");
                res.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                return "error";
        }
    }

    @ResponseBody
    @RequestMapping(value = "/storage/search", method = RequestMethod.POST)
    public String storageSearchAPI(HttpServletRequest req, HttpServletResponse res) {
        return "";
    }
}
