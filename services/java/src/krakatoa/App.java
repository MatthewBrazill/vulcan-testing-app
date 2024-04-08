package krakatoa;

import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.Reader;
import java.util.ArrayList;
import java.util.Properties;

import org.apache.logging.log4j.core.config.Configurator;
import org.apache.logging.log4j.core.config.builder.api.AppenderComponentBuilder;
import org.apache.logging.log4j.core.config.builder.api.ConfigurationBuilder;
import org.apache.logging.log4j.core.config.builder.api.ConfigurationBuilderFactory;
import org.apache.logging.log4j.core.config.builder.api.LayoutComponentBuilder;
import org.apache.logging.log4j.core.config.builder.api.LoggerComponentBuilder;
import org.apache.logging.log4j.core.config.builder.impl.BuiltConfiguration;
import org.apache.logging.log4j.Level;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
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
@ComponentScan("krakatoa.controllers")
public class App implements WebMvcConfigurer {

	// * Add Mustache reader that supports partials
	@Bean
	public Mustache.Compiler mustacheCompiler(Mustache.TemplateLoader templateLoader, Environment environment) {
		Logger logger = LogManager.getLogger("krakatoa");
		logger.debug("Loading partials");
		
		templateLoader = new Mustache.TemplateLoader() {
			public Reader getTemplate(String name) throws FileNotFoundException {
				ArrayList<String> partials = new ArrayList<String>();
				partials.add("footer");
				partials.add("head");
				partials.add("nav");

				if (partials.contains(name)) {
					return new FileReader(ResourceUtils.getFile("file:../frontend/partials/" + name + ".html"));
				} else {
					return new FileReader(ResourceUtils.getFile("file:../frontend/pages/" + name + ".html"));
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
		Logger logger = LogManager.getLogger("krakatoa");
		logger.debug("Setting resource locations");

		registry.addResourceHandler("/js/**").addResourceLocations("file:../frontend/statics/js/");
		registry.addResourceHandler("/css/**").addResourceLocations("file:../frontend/statics/css/");
		registry.addResourceHandler("/img/**").addResourceLocations("file:../frontend/statics/img/");
	}
	// */

	public static void main(String[] args) {
		ConfigurationBuilder<BuiltConfiguration> builder = ConfigurationBuilderFactory.newConfigurationBuilder();

		// Create file appender
		AppenderComponentBuilder file = builder.newAppender("jsonFile", "File");
		file.addAttribute("fileName", "/logs/java.log");

		// Create logger layout
		LayoutComponentBuilder json = builder.newLayout("JsonLayout");
		json.addAttribute("complete", false);
		json.addAttribute("compact", true);
		json.addAttribute("eventEol", true);
		file.add(json);

		// Add apender to builder
		builder.add(file);

		// Attach appernder to logger
		LoggerComponentBuilder krakatoaLogger = builder.newLogger("krakatoa", Level.ALL);
		krakatoaLogger.add(builder.newAppenderRef("jsonFile"));
		builder.add(krakatoaLogger);

		// Configure logger
		Configurator.initialize(builder.build());
		Logger logger = LogManager.getLogger("krakatoa");
		logger.debug("Configured logging");

		// Create the app
		SpringApplication app = new SpringApplication(App.class);
		logger.debug("Created spring application");

		// Define properties
		Properties properties = new Properties();

		// Set up SSL
		properties.put("server.port", 443);
		properties.put("server.ssl.certificate", "file:" + System.getenv("VLCN_CERT_FOLDER") + "/cert.pem");
		properties.put("server.ssl.trust-certificate", "file:" + System.getenv("VLCN_CERT_FOLDER") + "/cert.pem");
		properties.put("server.ssl.certificate-private-key", "file:" + System.getenv("VLCN_CERT_FOLDER") + "/key.pem");

		// Configure Sessions
		String redisURL;
		if (System.getProperty("dd.env").equals("kubernetes")) {
			redisURL = "host.minikube.internal";
		} else {
			redisURL = "session-store";
		}

		properties.put("server.servlet.session.timeout", 86400);
		properties.put("server.servlet.session.cookie.name", "krakatoa");
		properties.put("spring.session.store-type", "redis");
		properties.put("spring.session.redis.flush-mode", "on_save");
		properties.put("spring.session.redis.namespace", "java:sess");
		properties.put("spring.data.redis.host", redisURL);
		properties.put("spring.data.redis.port", 6379);

		// Configure views
		properties.put("spring.mustache.prefix", "file:../frontend/pages/");
		properties.put("spring.mustache.suffix", ".html");
		logger.debug("Defined properties");

		// Set properties
		app.setDefaultProperties(properties);
		logger.debug("Applied properties");

		logger.info("Started application");
		app.run(args);
	}
}