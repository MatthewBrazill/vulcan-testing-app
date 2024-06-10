package vulcan;

import java.io.Reader;
import java.net.URI;
import java.net.URLDecoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpRequest.BodyPublishers;
import java.net.http.HttpRequest.Builder;
import java.net.http.HttpResponse.BodyHandlers;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;

import io.opentracing.Span;
import io.opentracing.log.Fields;
import io.opentracing.tag.Tags;
import io.opentracing.util.GlobalTracer;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;

import datadog.trace.api.Trace;

public class Helpers {

    @Trace(operationName = "vulcan.helper", resourceName = "Helpers.validate")
    public static Boolean validate(HashMap<String, Object> body) {
        // TODO add validation
        // String[][] params = { { "pantheon", "^[a-zA-Z]{1,32}$" }, { "name", "^[a-zA-Z]{1,32}$" }, { "domain", "^[0-9a-zA-Z ]{1,32}$" } };
        // String[][] params = { { "godId", "^[a-zA-Z0-9]{5}$" } };
        // String[][] params = { { "username", "^[a-zA-Z]{1,32}$" }, { "password", "^.{1,64}$" } };
        // String[][] params = { { "filter", "[a-zA-Z]{0,32}" } };
        return true;
    }

    @Trace(operationName = "vulcan.helper", resourceName = "Helpers.authorize")
    public static String authorize(HttpServletRequest req) {
        // Function variables
        HttpSession session = req.getSession();
        Span span = GlobalTracer.get().activeSpan();
		Logger logger = LogManager.getLogger("vulcan");

        try {
            // Generate the authorization request body
            HashMap<String, Object> body = new HashMap<String, Object>();
            if (req.getHeader("api-key") != null) {
                logger.debug("attempting to authorize user using api key");
                body.put("apiKey", req.getHeader("api-key"));
            } else {
                logger.debug("attempting to authorize user using username");
                body.put("username", session.getAttribute("username"));
            }

            // Make authorization request to authenticator service
            HttpResponse<String> res = Helpers.httpPostRequest(new URI("https://authenticator:2884/authorize"), body);

            // Handle response
            switch (res.statusCode()) {
                case HttpServletResponse.SC_OK:
                    // Extract HashMap from JSON body
                    Gson gson = new Gson();
                    Type type = new TypeToken<HashMap<String, String>>() {}.getType();
                    HashMap<String, String> auth = gson.fromJson(res.body(), type);

                    span.setTag("auth", true);
                    logger.info("user authorized as '" + auth.get("permissions") + "'");
                    return auth.get("permissions");

                case HttpServletResponse.SC_UNAUTHORIZED:
                    span.setTag("auth", false);
                    logger.info("user is not have authorized to access " + req.getRequestURI());
                    return "none";

                default:
                    throw new Exception("VulcanError: couldn't authorize request");
            }
        } catch (Exception e) {
            span.setTag(Tags.ERROR, true);
            span.log(Collections.singletonMap(Fields.ERROR_OBJECT, e));
            span.setTag("auth", false);
            return "none";
        }
    }

    @Trace(operationName = "vulcan.helper", resourceName = "Helpers.decodeBody")
    public static HashMap<String, Object> decodeBody(HttpServletRequest req) {
        HashMap<String, Object> output = new HashMap<String, Object>();
        Span span = GlobalTracer.get().activeSpan();

        try {
            if (req.getReader().ready()) {
                String contentType = req.getContentType().split(";")[0];
                span.setTag("content_type", contentType);
                switch (contentType) {
                    case "application/x-www-form-urlencoded":
                        String[] body = req.getReader().readLine().split("&");
                        for (int i = 0; i < body.length; i++) {
                            String[] attribute = body[i].split("=");
                            if (attribute.length == 2) {
                                output.put(attribute[0], URLDecoder.decode(attribute[1], StandardCharsets.UTF_8));
                            } else if (attribute.length == 1) {
                                output.put(attribute[0], "");
                            } else {
                                span.setTag(Tags.ERROR, true);
                                span.log(Collections.singletonMap(Fields.ERROR_OBJECT, new Exception("Unexpected Attribute Length: length: " + attribute.length + "; value: " + attribute.toString())));
                            }
                        }
                        break;

                    case "application/json":
                        Reader json = req.getReader();
                        Gson gson = new Gson();
                        output = gson.fromJson(json, new TypeToken<HashMap<String, Object>>() {}.getType());
                        break;

                    default:
                        span.setTag(Tags.ERROR, true);
                        span.log(Collections.singletonMap(Fields.ERROR_OBJECT, new Exception("Unsupported Content-Type: " + contentType)));
                }
            }
        } catch (Exception e) {
            span.setTag(Tags.ERROR, true);
            span.log(Collections.singletonMap(Fields.ERROR_OBJECT, e));
        }

        return output;
    }

}