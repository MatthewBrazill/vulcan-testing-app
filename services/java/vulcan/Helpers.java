package vulcan;

import java.io.IOException;
import java.util.HashMap;

import jakarta.servlet.http.HttpServletRequest;

public class Helpers {

    public static Boolean validate(HttpServletRequest req, String[][] patterns) {
        return true;
    }

    public static HashMap<String, Object> getBody(HttpServletRequest req) throws IOException {
        String[] body = req.getReader().readLine().split("&");
        HashMap<String, Object> output = new HashMap<String, Object>();

        for (int i = 0; i < body.length; i++) {
            String[] attribute = body[i].split("=");
            output.put(attribute[0], attribute[1]);
        }

        return output;
    }

}