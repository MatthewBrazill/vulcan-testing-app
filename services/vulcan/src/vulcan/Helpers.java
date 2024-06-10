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
        HttpSession session = req.getSession();
        Span span = GlobalTracer.get().activeSpan();
		Logger logger = LogManager.getLogger("vulcan");

        try {
            // Generate the authorization request body
            String jsonBody = "";
            if (req.getHeader("apiKey") != null) {
                jsonBody = ("{\"apiKey\":\"" + req.getHeader("apiKey") + "\"}");
            } else {
                jsonBody = ("{\"username\":\"" + session.getAttribute("username").toString() + "\"}");
            }

            // Make authorization request to authenticator service
            Builder builder = HttpRequest.newBuilder(new URI("http://authenticator:2884/authorize"));
            builder.POST(BodyPublishers.ofString(jsonBody));

            HttpClient client = HttpClient.newHttpClient();
            HttpResponse<String> response = client.send(builder.build(), BodyHandlers.ofString());

            // Extract response
            Gson gson = new Gson();
            Map<String, String> permissions = gson.fromJson(response.body(), new TypeToken<HashMap<String, String>>() {}.getType());

            // Handle response
            switch (response.statusCode()) {
                case 200:
                    return permissions.get("permissions");
                case 401:
                    logger.info("user does not have permission to access " + req.getRequestURI());
                    return "none";
                case 500:
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