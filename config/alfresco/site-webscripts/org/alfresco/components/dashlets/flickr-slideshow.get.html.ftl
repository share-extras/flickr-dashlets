<script type="text/javascript">//<![CDATA[
   new Alfresco.dashlet.FlickrSlideshow("${args.htmlid}").setOptions(
   {
      "componentId": "${instance.object.id}",
      "userId": "${args.userId!''}",
      "numPhotos": "${numPhotos!50}",
      "streamType": "user",
      "carouselEnabled": ${(args.carouselEnabled!true)?string}
   }).setMessages(
      ${messages}
   );
   new Alfresco.widget.DashletResizer("${args.htmlid}", "${instance.object.id}");
//]]></script>

<div class="dashlet flickr-slideshow-dashlet">
   <#if args.userName??>
   <div class="title" id="${args.htmlid}-title">&nbsp;</div>
   <#else>
   <div class="title" id="${args.htmlid}-title">${msg("header.default")}</div>
   </#if>
   <#if hasConfigPermission>
      <div class="toolbar">
         <a id="${args.htmlid}-configure-link" class="theme-color-1" title="${msg('link.configure')}" href="">${msg("link.configure")}</a>
      </div>
   </#if>
   <div id="${args.htmlid}-body" class="body" <#if args.height??>style="height: ${args.height}px;"</#if>>
      <div id="${args.htmlid}-overlay" class="photo-overlay">
         <div id="${args.htmlid}-overlay-title" class="photo-title"></div>
      </div>
      <div id="${args.htmlid}-photos" class="photos"></div>
      <div id="${args.htmlid}-message" class="message"></div>
      <div id="${args.htmlid}-ccontainer" class="ccontainer">
      	<div id="${args.htmlid}-carousel-bar" class="carousel-bar"></div>
      	<div id="${args.htmlid}-carousel" class="carousel"><ol></ol></div>
   	</div>
   </div>
</div>