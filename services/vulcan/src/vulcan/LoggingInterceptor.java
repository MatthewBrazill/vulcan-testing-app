package vulcan;

import java.util.HashMap;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.lang.NonNull;
import org.springframework.lang.Nullable;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.ModelAndView;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

public class LoggingInterceptor implements HandlerInterceptor {

    @Override
    public void postHandle(@NonNull HttpServletRequest req, @NonNull HttpServletResponse res, @NonNull Object handler, @Nullable ModelAndView modelAndView) {
        // Function imports
		Logger logger = LogManager.getLogger("vulcan");
        HashMap<String, Object> fields = new HashMap<String, Object>();

        fields.put("path", req.getContextPath());
        fields.put("method", req.getMethod());
        fields.put("status", res.getStatus());

        logger.info("vulcan accessed " + req.getContextPath() , fields);
    }
}