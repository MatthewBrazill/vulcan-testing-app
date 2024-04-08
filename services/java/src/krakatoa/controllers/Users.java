package krakatoa.controllers;

import java.sql.ResultSet;
import java.util.Collections;
import java.util.HashMap;

import io.opentracing.Span;
import io.opentracing.log.Fields;
import io.opentracing.tag.Tags;
import io.opentracing.util.GlobalTracer;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.ResponseBody;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import krakatoa.Helpers;
import krakatoa.Databases;

@Controller
public class Users {

	@RequestMapping(value = "/login", method = RequestMethod.GET)
	public String loginPage(Model model) {
		model.addAttribute("title", "Login Page");
		model.addAttribute("language", "Java");
		return "login";
	}

	@RequestMapping(value = "/user", method = RequestMethod.GET)
	public String userPage(Model model) {
		model.addAttribute("title", "User");
		model.addAttribute("language", "Java");
		return "user";
	}

	@ResponseBody
	@RequestMapping(value = "/login", method = RequestMethod.POST)
	public HashMap<String, Object> loginAPI(HttpServletRequest req, HttpServletResponse res) {
		String[][] params = { { "username", "^[a-zA-Z]{1,32}$" }, { "password", "^.{1,64}$" } };
		HashMap<String, Object> body = new HashMap<String, Object>();
		HashMap<String, Object> reqBody = Helpers.decodeBody(req);
		Span span = GlobalTracer.get().activeSpan();

		try {
			if (!Helpers.validate(req, params)) {
				res.setStatus(HttpServletResponse.SC_BAD_REQUEST);
				body.put("message", "There was an issue with your request.");
				return body;
			}

			ResultSet result = Databases.userDatabase().executeQuery("SELECT * FROM users WHERE username = '" + reqBody.get("username") + "'");
			result.first();
			String password = result.getString("password");

			if (reqBody.get("password").equals(password)) {
				req.getSession().setAttribute("username", reqBody.get("username"));
				res.setStatus(HttpServletResponse.SC_OK);
				body.put("message", "Successfully logged in.");
				return body;
			} else {
				res.setStatus(HttpServletResponse.SC_FORBIDDEN);
				body.put("message", "Your login details are incorrect.");
				return body;
			}
		} catch (Exception e) {
			res.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
			body.put("message", "There was an issue with the Server, please try again later.");

			span.setTag(Tags.ERROR, true);
			span.log(Collections.singletonMap(Fields.ERROR_OBJECT, e));

			return body;
		}
	}

	@RequestMapping(value = "/logout", method = RequestMethod.GET)
	public void logoutAPI(HttpServletRequest req, HttpServletResponse res) {
		req.getSession().invalidate();
		res.setStatus(HttpServletResponse.SC_OK);
	}
}