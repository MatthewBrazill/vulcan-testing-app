package vulcan;

import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.Reader;
import java.util.ArrayList;
import java.util.Properties;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.core.env.Environment;
import org.springframework.lang.NonNull;
import org.springframework.util.ResourceUtils;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import com.samskivert.mustache.Mustache;

@SpringBootConfiguration
@EnableAutoConfiguration
@ComponentScan("vulcan.controllers")
public class App implements WebMvcConfigurer {

	// * Add Mustache reader that supports partials
	@Bean
	public Mustache.Compiler mustacheCompiler(Mustache.TemplateLoader templateLoader, Environment environment) {
		templateLoader = new Mustache.TemplateLoader() {
			public Reader getTemplate(String name) throws FileNotFoundException {
				ArrayList<String> partials = new ArrayList<String>();
				partials.add("footer");
				partials.add("head");
				partials.add("nav");

				if (partials.contains(name)) {
					return new FileReader(ResourceUtils.getFile("file:services/frontend/partials/" + name + ".html"));
				} else {
					return new FileReader(ResourceUtils.getFile("file:services/frontend/pages/" + name + ".html"));
				}
			}
		};

		return Mustache.compiler()
				.defaultValue("error")
				.withLoader(templateLoader);
	}
	// */

	// * Set up statics
	@Override
	public void addResourceHandlers(@NonNull final ResourceHandlerRegistry registry) {
		
		registry.addResourceHandler("/js/**").addResourceLocations("file:statics/js/");
		registry.addResourceHandler("/css/**").addResourceLocations("file:statics/css/");
		registry.addResourceHandler("/img/**").addResourceLocations("file:statics/img/");
	}
	// */

	public static void main(String[] args) {
		// Create the app
		SpringApplication app = new SpringApplication(App.class);

		// Define properties
		Properties properties = new Properties();

		// Set up SSL
		properties.put("server.port", 443);
		properties.put("server.ssl.certificate", "file:cert/cert.pem");
		properties.put("server.ssl.trust-certificate", "file:cert/cert.pem");
		properties.put("server.ssl.certificate-private-key", "file:cert/key.pem");

		// Configure Sessions
		String redisURL;
		System.out.println(System.getProperty("dd.env"));
		if (System.getProperty("dd.env") == "kubernetes") {
			redisURL = "host.minikube.internal";
		} else {
			redisURL = "session-store";
		}

		properties.put("server.servlet.session.timeout", 86400);
		properties.put("spring.session.store-type", "redis");
		properties.put("spring.session.redis.flush-mode", "on_save");
		properties.put("spring.session.redis.namespace", "java:sess");
		properties.put("spring.data.redis.host", redisURL);
		properties.put("spring.data.redis.port", 6379);

		// Configure views
		properties.put("spring.mustache.prefix", "file:services/frontend/pages/");
		properties.put("spring.mustache.suffix", ".html");

		// Set properties
		app.setDefaultProperties(properties);

		System.out.println("start appliction");
		app.run(args);
	}
}