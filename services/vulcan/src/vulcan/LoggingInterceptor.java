package vulcan;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.logging.log4j.ThreadContext;
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

        ThreadContext.put("path", req.getServletPath());
        ThreadContext.put("method", req.getMethod());
        ThreadContext.put("status", String.valueOf(res.getStatus()));

        logger.info("vulcan accessed " + req.getServletPath());
    }
}