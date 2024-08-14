package vulcan.controllers;

import java.lang.reflect.Type;
import java.net.URI;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Properties;

import io.opentracing.Span;
import io.opentracing.log.Fields;
import io.opentracing.tag.Tags;
import io.opentracing.util.GlobalTracer;

import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.serialization.StringSerializer;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.ResponseBody;

import com.google.gson.Gson;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.reflect.TypeToken;
import com.password4j.BcryptFunction;
import com.password4j.Password;
import com.password4j.types.Bcrypt;

import datadog.trace.api.Trace;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import vulcan.Helpers;

@Controller
public class Users {

	@RequestMapping(value = "/user/{username}", method = RequestMethod.GET)
	public String userPage(HttpServletRequest req, HttpServletResponse res, @PathVariable String username, Model model) {
		// Function variables
		Span span = GlobalTracer.get().activeSpan();
		HashMap<String, Object> body = Helpers.decodeBody(req);
		Logger logger = LogManager.getLogger("vulcan");
		model.addAttribute("title", "User: '" + username + "'");

		// Authorize
		String permissions = Helpers.authorize(req);
		switch (permissions) {
			case "admin":
				// Validate the user input
				if (!Helpers.validate(body)) {
					res.setStatus(HttpServletResponse.SC_BAD_REQUEST);
					model.addAttribute("message", "There was an issue with your request.");
					return "error";
				}

				try {
					// Prep user request
					HashMap<String, Object> userRequest = new HashMap<String, Object>();
					userRequest.put("username", username);

					// Make user request
					HttpResponse<String> response = Helpers.httpPostRequest(new URI("https://user-manager:910/get"), userRequest);

					// Handle response
					switch (response.statusCode()) {
						case HttpServletResponse.SC_OK:
							res.setStatus(HttpServletResponse.SC_OK);
							logger.info("got user " + username);

							// Extract HashMap from JSON body
							Gson gson = new Gson();
							Type type = new TypeToken<HashMap<String, String>>() {
							}.getType();
							HashMap<String, Object> user = gson.fromJson(response.body(), type);

							model.addAttribute("user", true);
							model.addAttribute("username", user.get("username"));
							model.addAttribute("permissions", user.get("permissions"));
							return "user";

						case HttpServletResponse.SC_NOT_FOUND:
							res.setStatus(HttpServletResponse.SC_NOT_FOUND);
							logger.info("user not found for username '" + body.get("username") + "'");
							model.addAttribute("user", false);
							return "user";

						default:
							throw new Exception("VulcanError: unexpected response from user-manager");
					}
				} catch (Exception e) {
					res.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
					model.addAttribute("message", "There was an issue with the Server, please try again later.");

					span.setTag(Tags.ERROR, true);
					span.log(Collections.singletonMap(Fields.ERROR_OBJECT, e));

					logger.error("vulcan encountered error during user retrieval: " + e.getMessage(), e);
					return "error";
				}

			case "user":
			case "none":
				try {
					res.setStatus(HttpServletResponse.SC_FOUND);
					res.sendRedirect("/login");
					return null;
				} catch (Exception e) {
					res.setStatus(HttpServletResponse.SC_NOT_FOUND);
					return "error";
				}

			default:
				model.addAttribute("title", "Error");
				model.addAttribute("message", "There was an issue with the Server, please try again later.");
				res.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
				return "error";
		}
	}

	@ResponseBody
	@RequestMapping(value = "/users/all", method = RequestMethod.GET)
	public HashMap<String, Object> getAllUserAPI(HttpServletRequest req, HttpServletResponse res) {
		// Function variables
		Span span = GlobalTracer.get().activeSpan();
		HashMap<String, Object> body = Helpers.decodeBody(req);
		HashMap<String, Object> output = new HashMap<>();
		Logger logger = LogManager.getLogger("vulcan");

		// Authorize
		String permissions = Helpers.authorize(req);
		switch (permissions) {
			case "admin":
				// Validate the user input
				if (!Helpers.validate(body)) {
					res.setStatus(HttpServletResponse.SC_BAD_REQUEST);
					output.put("message", "There was an issue with your request.");
					return output;
				}

				try {
					// Make user request
					HttpResponse<String> response = Helpers.httpGetRequest(new URI("https://user-manager:910/all"));

					// Handle response
					switch (response.statusCode()) {
						case HttpServletResponse.SC_OK:
							res.setStatus(HttpServletResponse.SC_OK);
							logger.info("got all users");

							// Extract HashMap from JSON body
							Gson gson = new Gson();
							Type type = new TypeToken<List<HashMap<String, String>>>() {
							}.getType();
							List<HashMap<String, String>> users = gson.fromJson(response.body(), type);

							output.put("users", users);
							return output;

						case HttpServletResponse.SC_NOT_FOUND:
							res.setStatus(HttpServletResponse.SC_NOT_FOUND);
							logger.info("");
							output.put("message", "Couldn't find a user with that username.");
							return output;

						default:
							throw new Exception("VulcanError: unexpected response from user-manager");
					}
				} catch (Exception e) {
					res.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
					output.put("message", "There was an issue with the Server, please try again later.");

					span.setTag(Tags.ERROR, true);
					span.log(Collections.singletonMap(Fields.ERROR_OBJECT, e));

					logger.error("vulcan encountered error during user retrieval: " + e.getMessage(), e);
					return output;
				}

			case "user":
			case "none":
				res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
				output.put("message", "Your credentials are invalid.");
				return output;

			default:
				res.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
				output.put("message", "There was an issue with the Server, please try again later.");
				return output;
		}
	}

	@ResponseBody
	@RequestMapping(value = "/user/{username}/note/create", method = RequestMethod.POST)
	public HashMap<String, Object> userAddNoteAPI(HttpServletRequest req, HttpServletResponse res, @PathVariable String username) {
		// Function variables
		Span span = GlobalTracer.get().activeSpan();
		HashMap<String, Object> body = Helpers.decodeBody(req);
		HashMap<String, Object> output = new HashMap<>();
		Logger logger = LogManager.getLogger("vulcan");

		// Authorize
		String permissions = Helpers.authorize(req);
		switch (permissions) {
			case "admin":
				// Validate the user input
				if (!Helpers.validate(body)) {
					res.setStatus(HttpServletResponse.SC_BAD_REQUEST);
					output.put("message", "There was an issue with your request.");
					return output;
				}

				try {
					// Run kafka message prep, creation and send in new thread
					new Thread(null, null, "Kafka-Producer") {
						@Trace(operationName = "vulcan.kafka", resourceName = "Users.sendKafkaMessage")
						public void run() {
							// Prep note object
							HashMap<String, Object> note = new HashMap<String, Object>();
							note.put("username", username);
							note.put("note", body.get("note").toString().trim());

							// Create kafka producer
							Properties props = new Properties();
							props.setProperty(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "notes-queue:9092");
							props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
							props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
							KafkaProducer<String, String> kafka = new KafkaProducer<>(props);

							// Create kafka message
							Gson gson = new Gson();
							ProducerRecord<String, String> message = new ProducerRecord<String, String>("user-notes", gson.toJson(note));

							// Send, flush and close kafka
							kafka.send(message);
							kafka.flush();
							kafka.close();
						}
					}.start();

					// Return accepted status
					res.setStatus(HttpServletResponse.SC_ACCEPTED);
					output.put("message", "Accepted note request.");
					return output;
				} catch (Exception e) {
					res.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
					output.put("message", "There was an issue with the Server, please try again later.");

					span.setTag(Tags.ERROR, true);
					span.log(Collections.singletonMap(Fields.ERROR_OBJECT, e));

					logger.error("vulcan encountered error during user retrieval: " + e.getMessage(), e);
					return output;
				}

			case "user":
			case "none":
				res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
				output.put("message", "Your credentials are invalid.");
				return output;

			default:
				res.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
				output.put("message", "There was an issue with the Server, please try again later.");
				return output;
		}
	}

	@ResponseBody
	@RequestMapping(value = "/user/{username}/notes", method = RequestMethod.GET)
	public HashMap<String, Object> userGetNotesAPI(HttpServletRequest req, HttpServletResponse res, @PathVariable String username) {
		// Function variables
		Span span = GlobalTracer.get().activeSpan();
		HashMap<String, Object> output = new HashMap<>();
		Logger logger = LogManager.getLogger("vulcan");

		// Authorize
		String permissions = Helpers.authorize(req);
		switch (permissions) {
			case "admin":
				try {
					// Prep user request
					HashMap<String, Object> user = new HashMap<String, Object>();
					user.put("username", username);

					// Make user request
					HttpResponse<String> response = Helpers.httpPostRequest(new URI("https://user-manager:910/get"), user);

					// Handle response
					switch (response.statusCode()) {
						case HttpServletResponse.SC_OK:
							res.setStatus(HttpServletResponse.SC_OK);
							logger.info("got notes for user " + username);

							// Extract JSON body
							Gson gson = new Gson();
							System.out.println(response.body());
							JsonObject notesJson = gson.fromJson(response.body(), JsonElement.class).getAsJsonObject();

							ArrayList<String> notesArray = new ArrayList<>();
							notesJson.getAsJsonArray("notes").asList().forEach(note -> notesArray.add(note.getAsString()));

							output.put("notes", notesArray);
							return output;

						case HttpServletResponse.SC_NOT_FOUND:
							res.setStatus(HttpServletResponse.SC_NOT_FOUND);
							logger.info("user not found for username " + username);
							output.put("message", "Couldn't find a user with that username.");
							return output;

						default:
							throw new Exception("VulcanError: unexpected response from user-manager");
					}
				} catch (Exception e) {
					res.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
					output.put("message", "There was an issue with the Server, please try again later.");

					span.setTag(Tags.ERROR, true);
					span.log(Collections.singletonMap(Fields.ERROR_OBJECT, e));

					logger.error("vulcan encountered error during user retrieval: " + e.getMessage(), e);
					return output;
				}

			case "user":
			case "none":
				res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
				output.put("message", "Your credentials are invalid.");
				return output;

			default:
				res.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
				output.put("message", "There was an issue with the Server, please try again later.");
				return output;
		}
	}

	@RequestMapping(value = "/user/join", method = RequestMethod.GET)
	public String userPage(Model model) {
		model.addAttribute("title", "Join Vulcan");
		return "join";
	}

	@ResponseBody
	@RequestMapping(value = "/user/create", method = RequestMethod.POST)
	public HashMap<String, Object> userCreateAPI(HttpServletRequest req, HttpServletResponse res) {
		// Function variables
		Span span = GlobalTracer.get().activeSpan();
		HashMap<String, Object> body = Helpers.decodeBody(req);
		HashMap<String, Object> output = new HashMap<>();
		Logger logger = LogManager.getLogger("vulcan");

		// Validate the user input
		if (!Helpers.validate(body)) {
			res.setStatus(HttpServletResponse.SC_BAD_REQUEST);
			output.put("message", "There was an issue with your request.");
			return output;
		}

		try {
			// Hash password
			BcryptFunction bcrypt = BcryptFunction.getInstance(Bcrypt.B, 14);
			String pwhash = Password.hash(body.get("password").toString()).addPepper(System.getenv("PW_PEPPER")).with(bcrypt).getResult();

			// Build user object
			HashMap<String, Object> user = new HashMap<>();
			user.put("username", body.get("username"));
			user.put("permissions", "user");
			user.put("pwhash", pwhash);

			// Make user request
			HttpResponse<String> response = Helpers.httpPostRequest(new URI("https://user-manager:910/create"), user);

			// Handle user response
			switch (response.statusCode()) {
				case HttpServletResponse.SC_OK:
					res.setStatus(HttpServletResponse.SC_OK);
					logger.info("created user: " + body.get("username"));
					output.put("username", body.get("username"));
					return output;

				case HttpServletResponse.SC_CONFLICT:
					res.setStatus(HttpServletResponse.SC_CONFLICT);
					logger.info("user already exists: " + body.get("username"));
					output.put("message", "This username is already taken. Please choose a different one.");
					return output;

				default:
					throw new Exception("VulcanError: unexpected response from user-manager");
			}
		} catch (Exception e) {
			res.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
			output.put("message", "There was an issue with the Server, please try again later.");

			span.setTag(Tags.ERROR, true);
			span.log(Collections.singletonMap(Fields.ERROR_OBJECT, e));

			logger.error("vulcan encountered error during user creation: " + e.getMessage(), e);
			return output;
		}
	}

	@ResponseBody
	@RequestMapping(value = "/user/delete", method = RequestMethod.POST)
	public HashMap<String, Object> userDeleteAPI(HttpServletRequest req, HttpServletResponse res) {
		// Function variables
		Span span = GlobalTracer.get().activeSpan();
		HashMap<String, Object> body = Helpers.decodeBody(req);
		HashMap<String, Object> output = new HashMap<>();
		Logger logger = LogManager.getLogger("vulcan");

		// Authorize
		String permissions = Helpers.authorize(req);
		switch (permissions) {
			case "admin":
				// Validate the user input
				if (!Helpers.validate(body)) {
					res.setStatus(HttpServletResponse.SC_BAD_REQUEST);
					output.put("message", "There was an issue with your request.");
					return output;
				}

				try {
					// Prep user request
					HashMap<String, Object> username = new HashMap<String, Object>();
					username.put("username", body.get("username"));

					// Make authorization request to authenticator service
					HttpResponse<String> response = Helpers.httpPostRequest(new URI("https://user-manager:910/delete"), username);

					// Handle response
					switch (response.statusCode()) {
						case HttpServletResponse.SC_OK:
							res.setStatus(HttpServletResponse.SC_OK);
							logger.info("deleted user " + body.get("username"));
							output.put("message", "Successfully deleted user.");
							return output;

						case HttpServletResponse.SC_NOT_FOUND:
							res.setStatus(HttpServletResponse.SC_NOT_FOUND);
							logger.info("user not found for username " + body.get("username"));
							output.put("message", "Couldn't find a user with that username.");
							return output;

						default:
							throw new Exception("VulcanError: unexpected response from user-manager");
					}
				} catch (Exception e) {
					res.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
					output.put("message", "There was an issue with the Server, please try again later.");

					span.setTag(Tags.ERROR, true);
					span.log(Collections.singletonMap(Fields.ERROR_OBJECT, e));

					logger.error("vulcan encountered error during user deletion: " + e.getMessage(), e);
					return output;
				}

			case "user":
			case "none":
				res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
				output.put("message", "Your credentials are invalid.");
				return output;

			default:
				res.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
				output.put("message", "There was an issue with the Server, please try again later.");
				return output;
		}
	}
}